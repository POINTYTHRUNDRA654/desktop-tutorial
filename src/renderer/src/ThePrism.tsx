import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenAI } from "@google/genai";
import ReactMarkdown from 'react-markdown';
import { Triangle, Zap, BrainCircuit, ShieldAlert, Palette, Layers, ArrowRight, Loader2, Maximize2, Sparkles, Send } from 'lucide-react';

interface PrismShard {
    id: 'logic' | 'creative' | 'critic';
    name: string;
    icon: React.ElementType;
    color: string;
    bg: string;
    border: string;
    content: string;
    status: 'idle' | 'thinking' | 'complete';
}

const ThePrism: React.FC = () => {
    const [query, setQuery] = useState('');
    const [isRefracting, setIsRefracting] = useState(false);
    const [shards, setShards] = useState<PrismShard[]>([
        { id: 'logic', name: 'The Architect', icon: BrainCircuit, color: 'text-blue-400', bg: 'bg-blue-900/10', border: 'border-blue-500/30', content: '', status: 'idle' },
        { id: 'creative', name: 'The Visionary', icon: Palette, color: 'text-pink-400', bg: 'bg-pink-900/10', border: 'border-pink-500/30', content: '', status: 'idle' },
        { id: 'critic', name: 'The Sentinel', icon: ShieldAlert, color: 'text-red-400', bg: 'bg-red-900/10', border: 'border-red-500/30', content: '', status: 'idle' },
    ]);
    const [synthesis, setSynthesis] = useState('');
    const [synthesisStatus, setSynthesisStatus] = useState<'idle' | 'thinking' | 'complete'>('idle');

    const synthesisRef = useRef<HTMLDivElement>(null);

    // Auto-scroll synthesis
    useEffect(() => {
        if (synthesisStatus === 'complete' && synthesisRef.current) {
            synthesisRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [synthesisStatus]);

    const handleRefract = async () => {
        if (!query.trim()) return;
        setIsRefracting(true);
        setSynthesis('');
        setSynthesisStatus('idle');
        
        // Reset Shards
        setShards(prev => prev.map(s => ({ ...s, content: '', status: 'thinking' })));

        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

        // 1. Parallel Generation for Shards
        const shardPrompts = {
            logic: `You are 'The Architect', a hyper-logical AI focused on code efficiency, system stability, and structural integrity. Analyze this request: "${query}". Provide a technical, bullet-point breakdown of how to achieve this. Be concise.`,
            creative: `You are 'The Visionary', a wildly creative AI focused on aesthetics, lore, user experience, and "cool factor". Analyze this request: "${query}". Provide vivid ideas, artistic direction, or narrative flair. Be poetic but useful.`,
            critic: `You are 'The Sentinel', a paranoid security and QA AI. Analyze this request: "${query}". Identify potential bugs, edge cases, security risks, or logic flaws. Be harsh and warning-focused.`
        };

        const generateShard = async (shardId: 'logic' | 'creative' | 'critic') => {
            try {
                const response = await ai.models.generateContent({
                    model: 'gemini-3-flash-preview', // Fast model for shards
                    contents: shardPrompts[shardId],
                });
                setShards(prev => prev.map(s => s.id === shardId ? { ...s, content: response.text, status: 'complete' } : s));
                return response.text;
            } catch (e) {
                setShards(prev => prev.map(s => s.id === shardId ? { ...s, content: 'Data corrupted.', status: 'complete' } : s));
                return '';
            }
        };

        // Execute all 3 in parallel
        const results = await Promise.all([
            generateShard('logic'),
            generateShard('creative'),
            generateShard('critic')
        ]);

        // 2. Synthesis Phase
        setSynthesisStatus('thinking');
        
        try {
            const finalPrompt = `
            Synthesize the following three perspectives into a single, master-crafted solution for the user's request: "${query}".
            
            [Logic Perspective]: ${results[0]}
            [Creative Perspective]: ${results[1]}
            [Critic Perspective]: ${results[2]}
            
            Create a final response that balances technical correctness with creative flair, while mitigating the risks identified.
            Format with Markdown.
            `;

            const finalResponse = await ai.models.generateContent({
                model: 'gemini-3-pro-preview', // Smart model for synthesis
                contents: finalPrompt,
            });

            setSynthesis(finalResponse.text);
            setSynthesisStatus('complete');

        } catch (e) {
            setSynthesis('Synthesis failed. Neural alignment error.');
            setSynthesisStatus('complete');
        } finally {
            setIsRefracting(false);
        }
    };

    return (
        <div className="h-full flex flex-col bg-[#02040a] text-slate-200 font-sans relative overflow-hidden">
            {/* Background Light Effects */}
            <div className="absolute top-[-20%] left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-gradient-to-b from-white/5 to-transparent blur-[100px] pointer-events-none"></div>
            
            {/* Header */}
            <div className="p-6 flex justify-between items-center z-10 bg-black/40 backdrop-blur-md border-b border-white/10">
                <div className="flex items-center gap-3">
                    <div className="relative">
                        <Triangle className="w-8 h-8 text-white fill-white/10 animate-pulse-slow" />
                        <div className="absolute inset-0 bg-white/20 blur-lg rounded-full"></div>
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-white tracking-widest uppercase">The Prism</h1>
                        <p className="text-xs text-slate-400 font-mono">Cognitive Refraction & Synthesis Engine</p>
                    </div>
                </div>
                <div className="px-3 py-1 rounded-full border border-white/10 bg-white/5 text-xs text-slate-300 font-mono">
                    MODEL: GEMINI-3-PRO
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-8 relative z-10 custom-scrollbar">
                
                {/* Input Section */}
                <div className="max-w-4xl mx-auto mb-12 relative">
                    <textarea 
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Enter a complex query to be analyzed (e.g., 'Design a dynamic settlement attack system')..."
                        className="w-full bg-slate-900/80 border border-slate-700 rounded-2xl p-6 text-lg text-white placeholder-slate-500 focus:outline-none focus:border-white/30 focus:ring-1 focus:ring-white/20 transition-all shadow-2xl resize-none h-32"
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                handleRefract();
                            }
                        }}
                    />
                    <button 
                        onClick={handleRefract}
                        disabled={isRefracting || !query}
                        className="absolute bottom-4 right-4 p-3 bg-white text-black rounded-xl hover:bg-slate-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:scale-105 transform duration-200"
                    >
                        {isRefracting ? <Loader2 className="w-6 h-6 animate-spin" /> : <Send className="w-6 h-6" />}
                    </button>
                </div>

                {/* Shards Display */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12 max-w-7xl mx-auto">
                    {shards.map((shard) => (
                        <div 
                            key={shard.id}
                            className={`rounded-xl border p-6 transition-all duration-700 ${shard.bg} ${shard.border} ${
                                shard.status === 'thinking' ? 'animate-pulse opacity-80' : 
                                shard.status === 'complete' ? 'opacity-100 translate-y-0' : 'opacity-50 translate-y-4'
                            }`}
                        >
                            <div className="flex items-center gap-3 mb-4 pb-4 border-b border-white/5">
                                <div className={`p-2 rounded-lg bg-black/20 ${shard.color}`}>
                                    <shard.icon className="w-6 h-6" />
                                </div>
                                <h3 className={`text-lg font-bold ${shard.color}`}>{shard.name}</h3>
                            </div>
                            
                            <div className="min-h-[200px] text-sm text-slate-300 leading-relaxed font-mono">
                                {shard.status === 'thinking' ? (
                                    <div className="flex items-center gap-2 text-slate-500">
                                        <Loader2 className="w-4 h-4 animate-spin" /> Analyzing...
                                    </div>
                                ) : shard.content ? (
                                    <ReactMarkdown>{shard.content}</ReactMarkdown>
                                ) : (
                                    <span className="text-slate-600 italic">Awaiting input...</span>
                                )}
                            </div>
                        </div>
                    ))}
                </div>

                {/* Synthesis Result */}
                {synthesisStatus !== 'idle' && (
                    <div ref={synthesisRef} className="max-w-4xl mx-auto animate-slide-up">
                        <div className="relative">
                            <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 via-purple-500/10 to-pink-500/10 blur-xl rounded-full"></div>
                            <div className="relative bg-slate-900/90 border border-white/10 rounded-2xl p-8 shadow-2xl backdrop-blur-xl">
                                <div className="flex justify-between items-center mb-6">
                                    <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                                        <Sparkles className="w-6 h-6 text-yellow-400" />
                                        Final Synthesis
                                    </h2>
                                    {synthesisStatus === 'thinking' && (
                                        <div className="flex items-center gap-2 text-xs text-slate-400 uppercase tracking-widest animate-pulse">
                                            Merging Perspectives...
                                        </div>
                                    )}
                                </div>

                                <div className="prose prose-invert prose-lg max-w-none text-slate-300">
                                    {synthesisStatus === 'thinking' ? (
                                        <div className="space-y-4">
                                            <div className="h-4 bg-slate-800 rounded w-3/4 animate-pulse"></div>
                                            <div className="h-4 bg-slate-800 rounded w-full animate-pulse"></div>
                                            <div className="h-4 bg-slate-800 rounded w-5/6 animate-pulse"></div>
                                        </div>
                                    ) : (
                                        <ReactMarkdown>{synthesis}</ReactMarkdown>
                                    )}
                                </div>
                            </div>
                        </div>
                        
                        {/* Decorator Lines */}
                        <div className="flex justify-center mt-8 gap-1 opacity-20">
                            <div className="w-1 h-12 bg-blue-500"></div>
                            <div className="w-1 h-16 bg-purple-500"></div>
                            <div className="w-1 h-12 bg-pink-500"></div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ThePrism;