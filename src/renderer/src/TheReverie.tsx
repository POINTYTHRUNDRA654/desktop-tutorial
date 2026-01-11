import React, { useState, useEffect, useRef } from 'react';
import { GoogleGenAI } from "@google/genai";
import { Sparkles, BrainCircuit, Play, Pause, Save, ThumbsUp, ThumbsDown, ArrowRight, Lightbulb, Code, Palette, Zap, Layers } from 'lucide-react';

interface Dream {
    id: string;
    type: 'optimization' | 'creative' | 'prediction' | 'reflection';
    content: string;
    detail: string;
    timestamp: number;
    rating?: 'positive' | 'negative';
}

const TheReverie: React.FC = () => {
    const [dreams, setDreams] = useState<Dream[]>([]);
    const [isDreaming, setIsDreaming] = useState(false);
    const [lucidTopic, setLucidTopic] = useState('');
    const [plasticity, setPlasticity] = useState(72); // "Learning Rate" visualization
    const scrollRef = useRef<HTMLDivElement>(null);

    // Auto-scroll to new dreams
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
        }
    }, [dreams]);

    const generateDream = async () => {
        if (!isDreaming) return;

        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            
            const context = lucidTopic 
                ? `Focus strictly on this topic: "${lucidTopic}".` 
                : "Wander freely through code optimization, UI design concepts, or system architecture improvements.";

            const response = await ai.models.generateContent({
                model: 'gemini-3-flash-preview',
                contents: `You are an AI in a 'Reverie' state (idle processing). Generate a single, short, profound 'thought' or 'idea' that could help the user.
                ${context}
                Return JSON with:
                1. "type": "optimization" | "creative" | "prediction" | "reflection"
                2. "content": A catchy headline (max 8 words).
                3. "detail": A brief explanation or code snippet (max 30 words).`,
                config: { responseMimeType: 'application/json' }
            });

            const result = JSON.parse(response.text);
            const newDream: Dream = {
                id: Date.now().toString(),
                type: result.type,
                content: result.content,
                detail: result.detail,
                timestamp: Date.now()
            };

            setDreams(prev => [...prev, newDream]);
            
            // Randomize plasticity
            setPlasticity(prev => Math.min(100, Math.max(10, prev + (Math.random() * 10 - 5))));

        } catch (e) {
            console.error("Dream interrupted", e);
        }
    };

    // Dream Loop
    useEffect(() => {
        let interval: any;
        if (isDreaming) {
            // Initial dream
            generateDream();
            // Loop
            interval = setInterval(generateDream, 6000); // New thought every 6 seconds
        }
        return () => clearInterval(interval);
    }, [isDreaming, lucidTopic]);

    const rateDream = (id: string, rating: 'positive' | 'negative') => {
        setDreams(prev => prev.map(d => d.id === id ? { ...d, rating } : d));
        // Feedback effect
        if (rating === 'positive') setPlasticity(p => Math.min(100, p + 2));
    };

    const harvestDream = (dream: Dream) => {
        // Logic to save to Vault or Workshop would go here
        alert(`Harvested thought: "${dream.content}" to Long-Term Memory.`);
    };

    return (
        <div className="h-full flex flex-col bg-[#050505] text-slate-200 font-sans relative overflow-hidden">
            {/* Ambient Background */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className={`absolute top-[-50%] left-[-50%] w-[200%] h-[200%] bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-indigo-900/20 via-black to-black animate-spin-slow duration-[60s] opacity-50`}></div>
                <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-10 brightness-100 contrast-150"></div>
            </div>

            {/* Header */}
            <div className="relative z-10 p-6 flex justify-between items-center border-b border-white/5 bg-black/20 backdrop-blur-sm">
                <div>
                    <h1 className="text-2xl font-bold text-white flex items-center gap-3">
                        <Sparkles className={`w-6 h-6 ${isDreaming ? 'text-purple-400 animate-pulse' : 'text-slate-500'}`} />
                        The Reverie
                    </h1>
                    <p className="text-xs text-slate-400 font-mono mt-1"> subconscious_processing_unit // active</p>
                </div>
                
                {/* Neural Plasticity Meter */}
                <div className="flex items-center gap-4">
                    <div className="text-right">
                        <div className="text-[10px] font-bold text-slate-500 uppercase">Synaptic Plasticity</div>
                        <div className="text-purple-400 font-mono text-lg">{plasticity.toFixed(1)}%</div>
                    </div>
                    <div className="w-24 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                        <div 
                            className="h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-1000" 
                            style={{ width: `${plasticity}%` }}
                        ></div>
                    </div>
                </div>
            </div>

            <div className="flex-1 flex overflow-hidden relative z-10">
                {/* Left Controls */}
                <div className="w-80 bg-black/40 border-r border-white/5 p-6 flex flex-col gap-6 backdrop-blur-md">
                    <div>
                        <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">State Control</label>
                        <button 
                            onClick={() => setIsDreaming(!isDreaming)}
                            className={`w-full py-4 rounded-xl font-bold flex items-center justify-center gap-3 transition-all duration-500 ${
                                isDreaming 
                                ? 'bg-purple-900/20 text-purple-300 border border-purple-500/50 shadow-[0_0_30px_rgba(168,85,247,0.2)]' 
                                : 'bg-slate-800 text-slate-400 border border-slate-700 hover:border-slate-500'
                            }`}
                        >
                            {isDreaming ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current" />}
                            {isDreaming ? 'Pause Reverie' : 'Initiate Dream State'}
                        </button>
                    </div>

                    <div className="flex-1">
                        <label className="text-xs font-bold text-slate-500 uppercase mb-2 block flex items-center gap-2">
                            <BrainCircuit className="w-3 h-3" /> Lucid Direction
                        </label>
                        <textarea 
                            value={lucidTopic}
                            onChange={(e) => setLucidTopic(e.target.value)}
                            placeholder="Guide the dream... (e.g., 'Optimization strategies for React 19', 'Sci-fi UI concepts')"
                            className="w-full h-32 bg-slate-900/50 border border-white/10 rounded-xl p-3 text-sm text-slate-300 focus:outline-none focus:border-purple-500 resize-none transition-colors"
                        />
                        <p className="text-[10px] text-slate-600 mt-2">
                            Leaving this empty allows free-association and random idea generation.
                        </p>
                    </div>

                    <div className="border-t border-white/5 pt-6">
                        <div className="text-[10px] text-slate-500 font-mono mb-2">MEMORY BUFFER</div>
                        <div className="flex gap-1 flex-wrap">
                            {dreams.filter(d => d.rating === 'positive').slice(-5).map(d => (
                                <div key={d.id} className="w-2 h-2 rounded-full bg-purple-500 shadow-[0_0_5px_#a855f7]" title={d.content}></div>
                            ))}
                            {dreams.filter(d => d.rating === 'negative').slice(-5).map(d => (
                                <div key={d.id} className="w-2 h-2 rounded-full bg-red-900/50"></div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Right: The Stream */}
                <div className="flex-1 overflow-hidden relative flex flex-col">
                    <div ref={scrollRef} className="flex-1 overflow-y-auto p-8 space-y-8 scroll-smooth mask-gradient-top">
                        {dreams.length === 0 && !isDreaming && (
                            <div className="h-full flex flex-col items-center justify-center text-slate-600 opacity-50">
                                <Sparkles className="w-16 h-16 mb-4" />
                                <p>The mind is quiet.</p>
                            </div>
                        )}
                        
                        {dreams.map((dream) => (
                            <div key={dream.id} className="animate-slide-up max-w-3xl mx-auto group">
                                <div className={`relative p-6 rounded-2xl border backdrop-blur-md transition-all duration-500 ${
                                    dream.rating === 'positive' ? 'bg-purple-900/10 border-purple-500/40' :
                                    dream.rating === 'negative' ? 'opacity-50 bg-slate-900/20 border-slate-800 grayscale' :
                                    'bg-slate-900/40 border-white/10 hover:border-white/20'
                                }`}>
                                    {/* Icon */}
                                    <div className="absolute -left-3 -top-3 p-2 rounded-lg bg-black border border-slate-700 text-slate-400 shadow-xl">
                                        {dream.type === 'optimization' ? <Zap className="w-4 h-4 text-yellow-400" /> :
                                         dream.type === 'creative' ? <Palette className="w-4 h-4 text-pink-400" /> :
                                         dream.type === 'prediction' ? <ArrowRight className="w-4 h-4 text-blue-400" /> :
                                         <Lightbulb className="w-4 h-4 text-white" />}
                                    </div>

                                    {/* Content */}
                                    <div className="pl-4">
                                        <div className="flex justify-between items-start mb-2">
                                            <span className="text-[10px] uppercase font-bold tracking-widest text-slate-500">{dream.type}</span>
                                            <span className="text-[10px] font-mono text-slate-600">{new Date(dream.timestamp).toLocaleTimeString()}</span>
                                        </div>
                                        <h3 className="text-xl font-bold text-slate-100 mb-2 font-serif tracking-wide">{dream.content}</h3>
                                        <p className="text-sm text-slate-400 font-mono leading-relaxed border-l-2 border-white/10 pl-3">
                                            {dream.detail}
                                        </p>
                                    </div>

                                    {/* Interaction Overlay */}
                                    <div className="absolute top-4 right-4 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity translate-x-4 group-hover:translate-x-0">
                                        <button 
                                            onClick={() => rateDream(dream.id, 'positive')}
                                            className={`p-2 rounded-lg transition-colors ${dream.rating === 'positive' ? 'bg-purple-600 text-white' : 'bg-slate-800 hover:bg-purple-600 text-slate-400 hover:text-white'}`}
                                        >
                                            <ThumbsUp className="w-4 h-4" />
                                        </button>
                                        <button 
                                            onClick={() => rateDream(dream.id, 'negative')}
                                            className={`p-2 rounded-lg transition-colors ${dream.rating === 'negative' ? 'bg-red-900/50 text-red-200' : 'bg-slate-800 hover:bg-red-900/50 text-slate-400 hover:text-red-200'}`}
                                        >
                                            <ThumbsDown className="w-4 h-4" />
                                        </button>
                                        <div className="h-px w-full bg-white/10 my-1"></div>
                                        <button 
                                            onClick={() => harvestDream(dream)}
                                            className="p-2 bg-slate-800 hover:bg-emerald-600 text-slate-400 hover:text-white rounded-lg transition-colors" 
                                            title="Materialize to Vault"
                                        >
                                            <Save className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                                {/* Connecting Line */}
                                <div className="h-8 w-px bg-gradient-to-b from-white/10 to-transparent mx-auto my-2"></div>
                            </div>
                        ))}
                        
                        {isDreaming && (
                            <div className="flex justify-center py-4">
                                <div className="flex gap-1 animate-pulse">
                                    <div className="w-2 h-2 rounded-full bg-purple-500/50 animate-bounce" style={{ animationDelay: '0ms' }}></div>
                                    <div className="w-2 h-2 rounded-full bg-purple-500/50 animate-bounce" style={{ animationDelay: '150ms' }}></div>
                                    <div className="w-2 h-2 rounded-full bg-purple-500/50 animate-bounce" style={{ animationDelay: '300ms' }}></div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TheReverie;