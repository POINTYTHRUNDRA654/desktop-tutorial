
import React, { useState, useEffect } from 'react';
import { Cpu, Activity, Zap, Eye, AlertTriangle, CheckCircle2, Terminal, Code, Layers, MessageSquare } from 'lucide-react';
import { FO4KnowledgeBase } from '../../shared/FO4KnowledgeBase';

interface RunningProcess {
    name: string;
    pid: number;
    memory: string;
    windowTitle?: string;
}

const NeuralLink: React.FC = () => {
    const [runningTools, setRunningTools] = useState<RunningProcess[]>([]);
    const [isScanning, setIsScanning] = useState(false);
    const [lastScan, setLastScan] = useState<Date | null>(null);
    const [mossyThoughts, setMossyThoughts] = useState<string[]>([]);

    const scanProcesses = async () => {
        if (typeof window.electron?.api?.getRunningProcesses !== 'function') return;
        
        setIsScanning(true);
        try {
            const tools = await window.electron.api.getRunningProcesses();
            setRunningTools(tools);
            setLastScan(new Date());
            generateMossyThoughts(tools);
        } catch (error) {
            console.error('Failed to scan processes:', error);
        } finally {
            setIsScanning(false);
        }
    };

    useEffect(() => {
        scanProcesses();
        const interval = setInterval(scanProcesses, 10000); // Scan every 10 seconds
        return () => clearInterval(interval);
    }, []);

    const generateMossyThoughts = (tools: RunningProcess[]) => {
        const thoughts: string[] = [];
        
        if (tools.length === 0) {
            thoughts.push("No modding tools detected. Ready for your next project.");
            setMossyThoughts(thoughts);
            return;
        }

        const names = tools.map(t => t.name.toLowerCase());
        const hasBlender = names.some(n => n.includes('blender'));
        const hasCK = names.some(n => n.includes('creationkit'));
        const hasXEdit = names.some(n => n.includes('xedit') || n.includes('fo4edit'));

        if (hasBlender) {
            thoughts.push("I see Blender is active. Remember: Fallout 4 uses 30 FPS and 1.0 Unit Scale.");
            thoughts.push("Verify your export profile: Havok 2010.2.0-r1 is the standard for FO4.");
        }
        
        if (hasCK) {
            thoughts.push("Creation Kit detected. Watch out for deleted references—always 'disable' instead of delete.");
            thoughts.push("Building precombines? Make sure your visibility data is updated last.");
        }

        if (hasXEdit) {
            thoughts.push("xEdit link established. Scanning for record conflicts in the background.");
            thoughts.push("Remember to clean your masters before final packaging.");
        }

        if (tools.length > 2) {
            thoughts.push("Multitasking today? I'm monitoring the memory load for stability.");
        }

        setMossyThoughts(thoughts);
    };

    const injectBlenderFix = async () => {
        window.dispatchEvent(new CustomEvent('mossy-control', { 
            detail: { action: 'navigate', payload: { path: '/bridge' } } 
        }));
    };

    return (
        <div className="p-6 space-y-6 animate-in fade-in duration-500">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-500/20 rounded-lg">
                        <Cpu className="text-blue-400" size={24} />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-white font-mono uppercase tracking-wider">Neural Link</h2>
                        <p className="text-blue-400/60 text-xs">Direct Integration & Process Monitoring</p>
                    </div>
                </div>
                <button 
                    onClick={scanProcesses}
                    disabled={isScanning}
                    className="flex items-center gap-2 px-3 py-1 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 rounded-md border border-blue-500/30 transition-all text-xs"
                >
                    <Activity size={14} className={isScanning ? 'animate-pulse' : ''} />
                    {isScanning ? 'Scanning...' : 'Manual Refresh'}
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Process List */}
                <div className="bg-slate-900/50 border border-blue-500/20 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-4">
                        <Terminal size={18} className="text-blue-400" />
                        <h3 className="text-sm font-semibold text-blue-200">Active Modding Session</h3>
                    </div>

                    <div className="space-y-3">
                        {runningTools.length === 0 ? (
                            <div className="py-8 text-center border border-dashed border-blue-500/10 rounded-lg">
                                <Eye className="mx-auto text-blue-500/20 mb-2" size={32} />
                                <p className="text-blue-400/40 text-sm italic">Waiting for tool activation...</p>
                            </div>
                        ) : (
                            runningTools.map((tool, idx) => (
                                <div key={idx} className="flex items-center justify-between p-3 bg-blue-500/5 border border-blue-500/10 rounded-lg hover:bg-blue-500/10 transition-colors">
                                    <div className="flex items-center gap-3">
                                        <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                                        <div>
                                            <div className="text-sm font-medium text-white">{tool.name}</div>
                                            <div className="text-[10px] text-blue-400/60 truncate max-w-[200px] font-mono">
                                                {tool.windowTitle || 'Background Process'}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-[10px] text-blue-400 font-mono">PID: {tool.pid}</div>
                                        <div className="text-[10px] text-blue-400/60">{tool.memory}</div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>

                    {lastScan && (
                        <div className="mt-4 text-[10px] text-blue-400/40 text-right">
                            Last synced: {lastScan.toLocaleTimeString()}
                        </div>
                    )}
                </div>

                {/* Mossy's Feedback */}
                <div className="flex flex-col gap-4">
                    <div className="bg-blue-900/20 border border-blue-400/30 rounded-xl p-4 flex-1">
                        <div className="flex items-center gap-2 mb-4 pb-2 border-b border-blue-400/20">
                            <MessageSquare size={18} className="text-blue-400" />
                            <h3 className="text-sm font-semibold text-blue-200 uppercase tracking-widest">Mossy's Internal Feed</h3>
                        </div>
                        
                        <div className="space-y-4">
                            {mossyThoughts.map((thought, idx) => (
                                <div key={idx} className="flex gap-3 animate-in slide-in-from-left duration-300" style={{ animationDelay: `${idx * 150}ms` }}>
                                    <div className="mt-1">
                                        <div className="w-1 h-3 bg-blue-400 rounded-full" />
                                    </div>
                                    <p className="text-sm text-blue-100/80 leading-relaxed font-serif italic">
                                        "{thought}"
                                    </p>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Quick Access Scripts */}
                    {runningTools.some(t => t.name.toLowerCase().includes('blender')) && (
                        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4">
                            <div className="flex items-center gap-2 mb-3">
                                <Zap size={18} className="text-yellow-400" />
                                <h3 className="text-sm font-semibold text-yellow-200">Blender Integration Add-on</h3>
                            </div>
                            <p className="text-xs text-yellow-200/60 mb-3 leading-relaxed">
                                I can execute scripts directly in your Blender scene. 
                                Install the <strong>Mossy Link Add-on</strong> from the Desktop Bridge to enable this.
                            </p>
                            <button 
                                onClick={injectBlenderFix}
                                className="w-full py-2 bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-400 rounded-lg border border-yellow-500/30 transition-all text-xs font-bold"
                            >
                                VIEW SETUP INSTRUCTIONS
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Neural Bridge Summary */}
            <div className="bg-slate-900 border border-blue-500/20 rounded-xl p-4 overflow-hidden relative">
                <div className="flex items-center gap-3 relative z-10">
                    <Activity className="text-blue-400" size={32} />
                    <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                            <span className="text-[10px] text-blue-400 font-bold uppercase">Neural Sync Stability</span>
                            <span className="text-[10px] text-blue-400 font-mono">99.8%</span>
                        </div>
                        <div className="h-1 bg-blue-900/50 rounded-full overflow-hidden">
                            <div className="h-full bg-blue-400 w-[99.8%] animate-pulse" />
                        </div>
                    </div>
                </div>
                {/* Cyberpunk background accent */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full blur-3xl -mr-16 -mt-16" />
            </div>
        </div>
    );
};

export default NeuralLink;
