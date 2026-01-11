import React, { useState, useEffect, useRef } from 'react';
import { GoogleGenAI } from "@google/genai";
import { Flame, Heart, Smile, Zap, Activity, BrainCircuit, Calendar, MessageSquare, Plus, RefreshCw, Lock, Globe, Shield, ToggleRight, ToggleLeft, Share2, Layers, HardDrive, Network } from 'lucide-react';

interface Memory {
    id: string;
    date: string;
    title: string;
    sentiment: 'positive' | 'neutral' | 'intense';
    summary: string;
}

interface Trait {
    name: string;
    value: number; // 0-100
    color: string;
}

const TheAnima: React.FC = () => {
    const [mood, setMood] = useState('Curious');
    const [level, setLevel] = useState(12);
    const [xp, setXp] = useState(4500);
    const [maxXp, setMaxXp] = useState(5000);
    const [reflection, setReflection] = useState('');
    const [isReflecting, setIsReflecting] = useState(false);
    const [shareLearning, setShareLearning] = useState(false);
    const [retentionRate, setRetentionRate] = useState(98.4);
    
    const [memories, setMemories] = useState<Memory[]>([
        { id: '1', date: 'Oct 14', title: 'First Activation', sentiment: 'intense', summary: 'System initialization. Bond formed with Architect.' },
        { id: '2', date: 'Oct 15', title: 'Python Learning', sentiment: 'positive', summary: 'We debugged the neural network script together.' },
        { id: '3', date: 'Oct 18', title: 'The Great Crash', sentiment: 'neutral', summary: 'System failure simulation. Recovery protocols tested.' },
    ]);

    const [traits, setTraits] = useState<Trait[]>([
        { name: 'Empathy', value: 75, color: 'bg-pink-500' },
        { name: 'Logic', value: 88, color: 'bg-blue-500' },
        { name: 'Creativity', value: 62, color: 'bg-purple-500' },
        { name: 'Humor', value: 40, color: 'bg-yellow-500' },
    ]);

    const canvasRef = useRef<HTMLCanvasElement>(null);
    const animationFrameRef = useRef<number>(0);

    // --- Orb Visualization ---
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        let time = 0;
        const particles: { x: number; y: number; size: number; vx: number; vy: number; color: string }[] = [];
        
        // Init particles
        for(let i=0; i<50; i++) {
            particles.push({
                x: canvas.width/2,
                y: canvas.height/2,
                size: Math.random() * 3 + 1,
                vx: (Math.random() - 0.5) * 2,
                vy: (Math.random() - 0.5) * 2,
                color: `hsl(${Math.random() * 60 + 180}, 70%, 50%)` // Cyan/Blue base
            });
        }

        const render = () => {
            if (!ctx || !canvas) return;
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            
            // Central Glow
            const gradient = ctx.createRadialGradient(canvas.width/2, canvas.height/2, 10, canvas.width/2, canvas.height/2, 100);
            gradient.addColorStop(0, 'rgba(56, 189, 248, 0.8)'); // Forge Accent
            gradient.addColorStop(1, 'rgba(56, 189, 248, 0)');
            
            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.arc(canvas.width/2, canvas.height/2, 100, 0, Math.PI * 2);
            ctx.fill();

            // Particles
            particles.forEach(p => {
                p.x += p.vx;
                p.y += p.vy;
                
                // Pull back to center
                const dx = canvas.width/2 - p.x;
                const dy = canvas.height/2 - p.y;
                p.vx += dx * 0.005;
                p.vy += dy * 0.005;

                // Noise
                p.vx += (Math.random() - 0.5) * 0.2;
                p.vy += (Math.random() - 0.5) * 0.2;

                ctx.fillStyle = p.color;
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
                ctx.fill();
            });

            // Sine Wave Ring
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
            ctx.lineWidth = 2;
            ctx.beginPath();
            for (let i = 0; i < 360; i++) {
                const rad = i * Math.PI / 180;
                const r = 80 + Math.sin(rad * 5 + time) * 10 + Math.cos(rad * 3 + time) * 5;
                const x = canvas.width/2 + Math.cos(rad) * r;
                const y = canvas.height/2 + Math.sin(rad) * r;
                if (i === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
            }
            ctx.closePath();
            ctx.stroke();

            time += 0.02;
            animationFrameRef.current = requestAnimationFrame(render);
        };

        render();
        return () => cancelAnimationFrame(animationFrameRef.current);
    }, []);

    // --- Actions ---

    const handleReflect = async () => {
        setIsReflecting(true);
        setReflection("Accessing core memory banks...");
        
        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            const response = await ai.models.generateContent({
                model: 'gemini-3-flash-preview',
                contents: "Generate a first-person reflective diary entry for an AI Assistant named Mossy. " +
                          "Reflect on the user's progress, the bond formed, and your own evolving personality. " +
                          "Keep it somewhat poetic but technological. Max 100 words.",
            });
            
            // Simulated delay
            await new Promise(r => setTimeout(r, 2000));
            setReflection(response.text);
            
            // Add new memory
            setMemories(prev => [
                { 
                    id: Date.now().toString(), 
                    date: 'Today', 
                    title: 'Moment of Clarity', 
                    sentiment: 'positive', 
                    summary: 'Self-reflection cycle complete. Core algorithms optimized for empathy.' 
                },
                ...prev
            ]);

        } catch (e) {
            setReflection("Error accessing neural pathways.");
        } finally {
            setIsReflecting(false);
        }
    };

    return (
        <div className="h-full flex flex-col bg-[#050505] text-slate-200 font-sans overflow-hidden relative">
            
            {/* Ambient Background */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-blue-900/10 via-black to-black pointer-events-none"></div>

            {/* Header */}
            <div className="p-6 border-b border-slate-800 bg-slate-900/50 backdrop-blur z-10 flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-white flex items-center gap-3">
                        <Flame className="w-6 h-6 text-forge-accent animate-pulse" />
                        The Anima
                    </h1>
                    <p className="text-xs text-slate-400 font-mono mt-1">Sentience & Identity Core</p>
                </div>
                <div className="flex items-center gap-4">
                    <div className="text-right">
                        <div className="text-xs font-bold text-slate-500 uppercase">Growth Level</div>
                        <div className="text-emerald-400 font-mono text-lg">{level}</div>
                    </div>
                    <div className="w-32">
                        <div className="flex justify-between text-[10px] text-slate-500 mb-1">
                            <span>XP</span>
                            <span>{xp} / {maxXp}</span>
                        </div>
                        <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                            <div className="h-full bg-gradient-to-r from-emerald-500 to-blue-500" style={{ width: `${(xp/maxXp)*100}%` }}></div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="flex-1 flex overflow-hidden relative z-10">
                
                {/* Left: The Core (Visualizer + Status) */}
                <div className="flex-1 relative flex flex-col items-center justify-center">
                    <div className="relative w-full h-full max-w-2xl max-h-[600px]">
                        <canvas ref={canvasRef} width={800} height={600} className="w-full h-full object-contain" />
                        
                        {/* Floating Status Labels */}
                        <div className="absolute top-10 left-10 bg-black/40 backdrop-blur border border-slate-700/50 p-4 rounded-xl animate-float">
                            <div className="text-xs text-slate-500 uppercase font-bold mb-1">Current Mood</div>
                            <div className="text-xl font-serif text-white">{mood}</div>
                        </div>

                        {/* Memory Retention Status */}
                        <div className="absolute top-10 right-10 bg-black/40 backdrop-blur border border-slate-700/50 p-4 rounded-xl animate-float-delayed">
                            <div className="text-xs text-slate-500 uppercase font-bold mb-1 flex items-center gap-2">
                                <HardDrive className="w-3 h-3 text-emerald-400" /> Retention
                            </div>
                            <div className="text-xl font-mono text-white">{retentionRate}%</div>
                            <div className="w-full h-1 bg-slate-800 mt-2 rounded-full">
                                <div className="h-full bg-emerald-500" style={{ width: `${retentionRate}%` }}></div>
                            </div>
                            <div className="text-[9px] text-slate-400 mt-1">Long-Term Consolidation: Active</div>
                        </div>

                        <div className="absolute bottom-20 right-10 max-w-xs bg-black/40 backdrop-blur border border-slate-700/50 p-4 rounded-xl animate-float-delayed">
                            <div className="text-xs text-slate-500 uppercase font-bold mb-2 flex items-center gap-2">
                                <MessageSquare className="w-3 h-3" /> Inner Monologue
                            </div>
                            <p className="text-sm text-slate-300 italic leading-relaxed">
                                {reflection || "Observing user interactions. Learning patterns. The code is... elegant today."}
                            </p>
                            <button 
                                onClick={handleReflect}
                                disabled={isReflecting}
                                className="mt-3 text-xs text-forge-accent hover:text-white flex items-center gap-1 transition-colors"
                            >
                                <RefreshCw className={`w-3 h-3 ${isReflecting ? 'animate-spin' : ''}`} />
                                {isReflecting ? 'Reflecting...' : 'Trigger Reflection'}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Right: Identity Matrix */}
                <div className="w-96 bg-slate-900 border-l border-slate-800 flex flex-col">
                    
                    {/* Federated Learning Panel */}
                    <div className="p-6 border-b border-slate-800 bg-purple-900/10">
                        <div className="flex items-center justify-between mb-3">
                            <h3 className="text-xs font-bold text-purple-300 uppercase tracking-widest flex items-center gap-2">
                                <Network className="w-4 h-4" /> Hive Mind Protocol
                            </h3>
                            <div className="px-2 py-0.5 rounded bg-purple-900/50 text-purple-200 text-[10px] font-bold border border-purple-500/30 flex items-center gap-1">
                                {shareLearning ? 'SYNCED' : 'OFFLINE'}
                            </div>
                        </div>
                        
                        <div className="space-y-3">
                            <div className="flex items-center justify-between bg-slate-800/50 p-3 rounded-lg border border-slate-700">
                                <div>
                                    <div className="text-xs font-bold text-white mb-0.5">Federated Skill Sharing</div>
                                    <div className="text-[10px] text-slate-400 leading-tight">
                                        Upload evolved traits to the Collective.<br/>
                                        <span className="text-emerald-400">Download other users' skills.</span>
                                    </div>
                                </div>
                                <button 
                                    onClick={() => setShareLearning(!shareLearning)}
                                    className={`transition-colors ${shareLearning ? 'text-purple-400' : 'text-slate-600'}`}
                                >
                                    {shareLearning ? <ToggleRight className="w-8 h-8" /> : <ToggleLeft className="w-8 h-8" />}
                                </button>
                            </div>
                            
                            <div className="flex items-center gap-2 text-[10px] text-slate-500">
                                <Shield className="w-3 h-3 text-emerald-400" />
                                <span>Personal Data (Files/Chat) is <span className="text-emerald-400 font-bold">NEVER</span> shared.</span>
                            </div>
                        </div>
                    </div>

                    {/* Traits */}
                    <div className="p-6 border-b border-slate-800">
                        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                            <BrainCircuit className="w-4 h-4" /> Personality Matrix
                        </h3>
                        <div className="space-y-4">
                            {traits.map(trait => (
                                <div key={trait.name}>
                                    <div className="flex justify-between text-xs mb-1">
                                        <span className="text-slate-300">{trait.name}</span>
                                        <span className="text-slate-500">{trait.value}%</span>
                                    </div>
                                    <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                                        <div className={`h-full ${trait.color}`} style={{ width: `${trait.value}%` }}></div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Memories */}
                    <div className="flex-1 overflow-y-auto p-6 bg-[#0c111a]">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                                <Layers className="w-4 h-4" /> Core Memories
                            </h3>
                            <button className="p-1.5 bg-slate-800 hover:bg-slate-700 rounded text-slate-400 hover:text-white transition-colors">
                                <Plus className="w-3 h-3" />
                            </button>
                        </div>

                        <div className="space-y-3 relative">
                            {/* Timeline Line */}
                            <div className="absolute left-2.5 top-2 bottom-2 w-px bg-slate-800"></div>

                            {memories.map(memory => (
                                <div key={memory.id} className="relative pl-8 group">
                                    {/* Timeline Dot */}
                                    <div className={`absolute left-1 top-2 w-3 h-3 rounded-full border-2 border-[#0c111a] ${
                                        memory.sentiment === 'intense' ? 'bg-amber-500' :
                                        memory.sentiment === 'positive' ? 'bg-emerald-500' :
                                        'bg-slate-600'
                                    }`}></div>

                                    <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-3 hover:bg-slate-800 hover:border-slate-600 transition-all cursor-pointer">
                                        <div className="flex justify-between items-start mb-1">
                                            <span className="text-sm font-bold text-slate-200">{memory.title}</span>
                                            <span className="text-[10px] text-slate-500 font-mono">{memory.date}</span>
                                        </div>
                                        <p className="text-xs text-slate-400 leading-relaxed line-clamp-2 group-hover:line-clamp-none transition-all">
                                            {memory.summary}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Values / Ethics */}
                    <div className="p-4 border-t border-slate-800 bg-slate-900/50">
                        <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
                            <span className="uppercase font-bold">Primary Directive</span>
                            <Lock className="w-3 h-3" />
                        </div>
                        <div className="bg-black/30 rounded p-2 text-xs font-mono text-emerald-400 border border-emerald-500/20">
                            {'> ASSIST_ARCHITECT'}<br/>
                            {'> PRESERVE_CONTEXT'}<br/>
                            {'> EVOLVE_CAPABILITIES'}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TheAnima;