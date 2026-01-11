import React, { useState } from 'react';
import { GoogleGenAI } from "@google/genai";
import { PenTool, Smartphone, Monitor, Code, Eye, RefreshCw, Zap, Copy, Check } from 'lucide-react';

const TheFabric: React.FC = () => {
    const [prompt, setPrompt] = useState('');
    const [code, setCode] = useState<string>('');
    const [isGenerating, setIsGenerating] = useState(false);
    const [viewMode, setViewMode] = useState<'preview' | 'code'>('preview');
    const [viewport, setViewport] = useState<'desktop' | 'mobile'>('desktop');
    const [copied, setCopied] = useState(false);

    const handleGenerate = async () => {
        if (!prompt.trim()) return;
        setIsGenerating(true);
        setCode(''); // Clear previous

        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            
            const systemPrompt = `
            You are an expert UI Engineer and Tailwind CSS architect.
            Task: Generate a standalone HTML/Tailwind snippet based on the user's description.
            Rules:
            1. Return ONLY the HTML code. No markdown fences, no explanations.
            2. Use standard Tailwind CSS utility classes.
            3. The root element should be a div with 'w-full h-full' and appropriate background.
            4. Design should be modern, sleek, and responsive.
            5. Assume a dark mode context (slate-900/black).
            
            User Description: "${prompt}"
            `;

            // Switched to flash-preview for speed and reliability against timeouts
            const response = await ai.models.generateContent({
                model: 'gemini-3-flash-preview',
                contents: systemPrompt,
            });

            // Clean up if model adds markdown despite instructions
            let cleanCode = response.text.replace(/```html/g, '').replace(/```/g, '').trim();
            setCode(cleanCode);

        } catch (e) {
            setCode('<div class="flex items-center justify-center h-full text-red-500 font-mono">Generation Failed. Neural Link Unstable.</div>');
        } finally {
            setIsGenerating(false);
        }
    };

    const handleCopy = () => {
        navigator.clipboard.writeText(code);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="h-full flex flex-col bg-[#0f172a] text-slate-200 font-sans relative overflow-hidden">
            {/* Header */}
            <div className="p-4 border-b border-slate-700 bg-slate-900 flex justify-between items-center z-10 shadow-md">
                <div>
                    <h2 className="text-xl font-bold text-white flex items-center gap-3">
                        <PenTool className="w-6 h-6 text-pink-400" />
                        The Fabric
                    </h2>
                    <p className="text-xs text-slate-400 font-mono mt-1">Neural Interface Synthesizer</p>
                </div>
                
                {/* Viewport Controls */}
                <div className="flex gap-4 items-center">
                    <div className="flex bg-slate-800 rounded-lg p-1 border border-slate-700">
                        <button 
                            onClick={() => setViewport('desktop')}
                            className={`p-2 rounded transition-colors ${viewport === 'desktop' ? 'bg-slate-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}
                            title="Desktop View"
                        >
                            <Monitor className="w-4 h-4" />
                        </button>
                        <button 
                            onClick={() => setViewport('mobile')}
                            className={`p-2 rounded transition-colors ${viewport === 'mobile' ? 'bg-slate-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}
                            title="Mobile View"
                        >
                            <Smartphone className="w-4 h-4" />
                        </button>
                    </div>

                    <div className="flex bg-slate-800 rounded-lg p-1 border border-slate-700">
                        <button 
                            onClick={() => setViewMode('preview')}
                            className={`px-3 py-1.5 rounded text-xs font-bold flex items-center gap-2 transition-colors ${viewMode === 'preview' ? 'bg-pink-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}
                        >
                            <Eye className="w-3 h-3" /> Preview
                        </button>
                        <button 
                            onClick={() => setViewMode('code')}
                            className={`px-3 py-1.5 rounded text-xs font-bold flex items-center gap-2 transition-colors ${viewMode === 'code' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}
                        >
                            <Code className="w-3 h-3" /> Code
                        </button>
                    </div>
                </div>
            </div>

            <div className="flex-1 flex overflow-hidden">
                {/* Main Workspace */}
                <div className="flex-1 bg-[#050505] relative flex flex-col items-center justify-center p-8 overflow-hidden">
                    {/* Background Grid */}
                    <div className="absolute inset-0 opacity-10 pointer-events-none" 
                         style={{ backgroundImage: 'linear-gradient(#334155 1px, transparent 1px), linear-gradient(90deg, #334155 1px, transparent 1px)', backgroundSize: '20px 20px' }}>
                    </div>

                    <div 
                        className={`bg-white relative shadow-2xl transition-all duration-500 overflow-hidden ${
                            viewport === 'mobile' ? 'w-[375px] h-[667px] rounded-3xl border-8 border-slate-800' : 'w-full h-full max-w-5xl max-h-[800px] rounded-xl border border-slate-700'
                        }`}
                    >
                        {isGenerating ? (
                            <div className="w-full h-full flex flex-col items-center justify-center bg-slate-900 text-pink-400 gap-4">
                                <RefreshCw className="w-12 h-12 animate-spin" />
                                <div className="text-sm font-mono animate-pulse">Weaving Interface...</div>
                            </div>
                        ) : code ? (
                            viewMode === 'preview' ? (
                                <div className="w-full h-full overflow-auto bg-slate-900 custom-scrollbar">
                                    {/* Safe Render - Note: In production, sanitize this! */}
                                    <div dangerouslySetInnerHTML={{ __html: code }} className="w-full min-h-full" />
                                </div>
                            ) : (
                                <div className="w-full h-full bg-[#1e1e1e] p-4 overflow-auto custom-scrollbar relative group">
                                    <button 
                                        onClick={handleCopy}
                                        className="absolute top-4 right-4 p-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                                    >
                                        {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                                    </button>
                                    <pre className="text-xs font-mono text-blue-300 whitespace-pre-wrap">{code}</pre>
                                </div>
                            )
                        ) : (
                            <div className="w-full h-full flex flex-col items-center justify-center bg-slate-900 text-slate-600 gap-4">
                                <PenTool className="w-16 h-16 opacity-20" />
                                <p className="text-sm">Ready to synthesize.</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Input Panel */}
                <div className="w-full md:w-80 bg-slate-900 border-l border-slate-800 flex flex-col p-6 shadow-xl z-20">
                    <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4">Design Parameters</h3>
                    
                    <div className="flex-1 flex flex-col gap-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-400 mb-2">Prompt</label>
                            <textarea 
                                value={prompt}
                                onChange={(e) => setPrompt(e.target.value)}
                                placeholder="Describe the UI (e.g. 'A futuristic login screen with neon borders and a particle background')..."
                                className="w-full h-40 bg-slate-800 border border-slate-700 rounded-xl p-4 text-sm text-white focus:outline-none focus:border-pink-500 resize-none transition-colors"
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && !e.shiftKey) {
                                        e.preventDefault();
                                        handleGenerate();
                                    }
                                }}
                            />
                        </div>

                        <div className="p-4 bg-slate-800/50 rounded-xl border border-slate-700/50">
                            <div className="text-[10px] text-slate-500 uppercase font-bold mb-2">Capabilities</div>
                            <div className="flex flex-wrap gap-2">
                                <span className="px-2 py-1 rounded bg-pink-900/20 text-pink-400 text-[10px] border border-pink-500/30">Tailwind CSS</span>
                                <span className="px-2 py-1 rounded bg-blue-900/20 text-blue-400 text-[10px] border border-blue-500/30">Responsive</span>
                                <span className="px-2 py-1 rounded bg-emerald-900/20 text-emerald-400 text-[10px] border border-emerald-500/30">Modern UI</span>
                            </div>
                        </div>

                        <button 
                            onClick={handleGenerate}
                            disabled={!prompt || isGenerating}
                            className="w-full mt-auto py-4 bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-500 hover:to-rose-500 text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-pink-500/20 disabled:opacity-50 disabled:cursor-not-allowed group"
                        >
                            {isGenerating ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Zap className="w-5 h-5 fill-current group-hover:animate-pulse" />}
                            {isGenerating ? 'Synthesizing...' : 'Generate Interface'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TheFabric;