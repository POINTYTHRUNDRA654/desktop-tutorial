import React, { useState, useEffect } from 'react';
import { GoogleGenAI } from "@google/genai";
import { Dna, Zap, Plus, Code, CheckCircle2, AlertTriangle, Fingerprint, Microscope, Activity, ArrowRight, Loader2, Play, Cpu, Globe, Download, Upload, Share2, Users } from 'lucide-react';

interface Gene {
    id: string;
    name: string;
    description: string;
    version: string;
    type: 'core' | 'local' | 'global';
    status: 'active' | 'evolving' | 'dormant' | 'downloading';
    author?: string; // 'You' or Username
    popularity?: number; // Downloads
    code?: string;
}

const initialLocalGenes: Gene[] = [
    { id: '1', name: 'Natural Language Processor', description: 'Core linguistic understanding engine.', version: '3.5.0', type: 'core', status: 'active', author: 'System' },
    { id: '2', name: 'Visual Cortex', description: 'Image generation and analysis subsystem.', version: '2.1.0', type: 'core', status: 'active', author: 'System' },
    { id: '3', name: 'Web Scraper Logic', description: 'Custom trait: Parse HTML structure.', version: '1.0.0', type: 'local', status: 'active', author: 'You' },
];

const mockGlobalGenes: Gene[] = [
    { id: 'g1', name: 'Papyrus Debugger', description: 'Advanced stack trace analysis for Fallout 4 logs.', version: '1.2', type: 'global', status: 'dormant', author: 'NexusModder99', popularity: 8420 },
    { id: 'g2', name: 'Blender NIF Optimizer', description: 'Auto-corrects vertex normals for Bethesda games.', version: '0.9', type: 'global', status: 'dormant', author: 'MeshWizard', popularity: 3100 },
    { id: 'g3', name: 'React Component Weaver', description: 'Generates Tailwind UI components from text.', version: '2.0', type: 'global', status: 'dormant', author: 'DevOps_Dave', popularity: 12500 },
];

const TheGenome: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'local' | 'global'>('local');
    const [localGenes, setLocalGenes] = useState<Gene[]>(initialLocalGenes);
    const [globalGenes, setGlobalGenes] = useState<Gene[]>(mockGlobalGenes);
    
    const [prompt, setPrompt] = useState('');
    const [isEvolving, setIsEvolving] = useState(false);
    const [evolutionStage, setEvolutionStage] = useState(0); 
    const [generatedCode, setGeneratedCode] = useState('');
    const [newGeneName, setNewGeneName] = useState('');

    // --- Actions ---

    const handleEvolve = async () => {
        if (!prompt) return;
        setIsEvolving(true);
        setEvolutionStage(1);
        setGeneratedCode('');
        setNewGeneName('');

        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            
            // Stage 1: Sequencing (Analysis)
            await new Promise(r => setTimeout(r, 1500));
            setEvolutionStage(2);

            // Stage 2: Coding (Generation)
            const response = await ai.models.generateContent({
                model: 'gemini-3-flash-preview',
                contents: `Create a TypeScript function for an AI assistant capability described as: "${prompt}".
                Return a JSON object with:
                1. "name": A cool, technical name for this skill (e.g. "Sentiment_Analyzer_v1").
                2. "code": The typescript function logic.
                3. "description": A brief technical description.`,
                config: { responseMimeType: 'application/json' }
            });

            const result = JSON.parse(response.text);
            setGeneratedCode(result.code);
            setNewGeneName(result.name);
            
            await new Promise(r => setTimeout(r, 1000));
            setEvolutionStage(3);

        } catch (e) {
            console.error(e);
            setIsEvolving(false);
            setEvolutionStage(0);
        }
    };

    const handleIntegrate = () => {
        const newGene: Gene = {
            id: Date.now().toString(),
            name: newGeneName,
            description: `Auto-evolved trait: ${prompt}`,
            version: '1.0.0',
            type: 'local',
            status: 'active',
            author: 'You',
            code: generatedCode
        };
        
        setLocalGenes(prev => [...prev, newGene]);
        setIsEvolving(false);
        setEvolutionStage(0);
        setPrompt('');
        setGeneratedCode('');
    };

    const handleContribute = (geneId: string) => {
        // Simulate upload
        setLocalGenes(prev => prev.map(g => {
            if (g.id === geneId) {
                // In a real app, this would push to the DB
                return { ...g, type: 'global', author: 'You (Published)' };
            }
            return g;
        }));
        
        // Add to global list for visual feedback
        const gene = localGenes.find(g => g.id === geneId);
        if (gene) {
            setGlobalGenes(prev => [{...gene, type: 'global', author: 'You', popularity: 1, status: 'dormant'}, ...prev]);
        }
    };

    const handleDownload = (geneId: string) => {
        setGlobalGenes(prev => prev.map(g => g.id === geneId ? { ...g, status: 'downloading' } : g));
        
        setTimeout(() => {
            const gene = globalGenes.find(g => g.id === geneId);
            if (gene) {
                setLocalGenes(prev => [...prev, { ...gene, type: 'local', status: 'active' }]);
                setGlobalGenes(prev => prev.map(g => g.id === geneId ? { ...g, status: 'active' } : g));
            }
        }, 1500);
    };

    return (
        <div className="h-full flex flex-col bg-[#050910] text-slate-200 font-sans relative overflow-hidden">
            {/* Ambient DNA Background */}
            <div className="absolute inset-0 z-0 opacity-10 pointer-events-none">
                <svg width="100%" height="100%">
                    <pattern id="dna-pattern" x="0" y="0" width="100" height="100" patternUnits="userSpaceOnUse">
                        <path d="M50 0 Q 75 25 50 50 Q 25 75 50 100" stroke="#10b981" strokeWidth="1" fill="none" />
                        <path d="M50 0 Q 25 25 50 50 Q 75 75 50 100" stroke="#3b82f6" strokeWidth="1" fill="none" />
                        <line x1="35" y1="25" x2="65" y2="25" stroke="#4b5563" strokeWidth="1" />
                        <line x1="35" y1="75" x2="65" y2="75" stroke="#4b5563" strokeWidth="1" />
                    </pattern>
                    <rect width="100%" height="100%" fill="url(#dna-pattern)" />
                </svg>
            </div>

            {/* Header */}
            <div className="p-6 border-b border-slate-800 bg-slate-900/50 backdrop-blur z-10 flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-white flex items-center gap-3">
                        <Dna className="w-8 h-8 text-forge-accent animate-pulse-slow" />
                        The Genome
                    </h1>
                    <p className="text-xs text-slate-400 font-mono mt-1">Federated Skill Matrix & Evolution Engine</p>
                </div>
                <div className="flex gap-4">
                    <div className="flex bg-slate-800 rounded-lg p-1 border border-slate-700">
                        <button 
                            onClick={() => setActiveTab('local')}
                            className={`px-4 py-1.5 rounded text-xs font-bold flex items-center gap-2 transition-all ${activeTab === 'local' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'}`}
                        >
                            <Cpu className="w-3 h-3" /> My Traits
                        </button>
                        <button 
                            onClick={() => setActiveTab('global')}
                            className={`px-4 py-1.5 rounded text-xs font-bold flex items-center gap-2 transition-all ${activeTab === 'global' ? 'bg-purple-600 text-white' : 'text-slate-400 hover:text-white'}`}
                        >
                            <Globe className="w-3 h-3" /> Global Library
                        </button>
                    </div>
                </div>
            </div>

            <div className="flex-1 flex overflow-hidden z-10">
                {/* Main List */}
                <div className="flex-1 p-8 overflow-y-auto">
                    {activeTab === 'local' ? (
                        <>
                            <div className="flex justify-between items-center mb-6">
                                <h2 className="text-sm font-bold text-emerald-400 uppercase tracking-widest flex items-center gap-2">
                                    <Fingerprint className="w-4 h-4" /> Local Capabilities (Private)
                                </h2>
                                <span className="text-xs text-slate-500">Installed: {localGenes.length}</span>
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {localGenes.map(gene => (
                                    <div 
                                        key={gene.id} 
                                        className={`relative p-5 rounded-2xl border transition-all duration-300 hover:-translate-y-1 ${
                                            gene.type === 'core' 
                                            ? 'bg-slate-900/50 border-slate-700' 
                                            : 'bg-emerald-900/10 border-emerald-500/30'
                                        }`}
                                    >
                                        <div className="flex justify-between items-start mb-3">
                                            <div className={`p-2 rounded-lg ${
                                                gene.type === 'core' ? 'bg-blue-500/10 text-blue-400' : 'bg-emerald-500/10 text-emerald-400'
                                            }`}>
                                                {gene.type === 'core' ? <Cpu className="w-5 h-5" /> : <Zap className="w-5 h-5" />}
                                            </div>
                                            {gene.type === 'local' && (
                                                <button 
                                                    onClick={() => handleContribute(gene.id)}
                                                    className="flex items-center gap-1 text-[10px] bg-slate-800 hover:bg-purple-600 hover:text-white px-2 py-1 rounded text-slate-400 transition-colors"
                                                    title="Upload to Global Collective"
                                                >
                                                    <Share2 className="w-3 h-3" /> Share
                                                </button>
                                            )}
                                        </div>
                                        <h3 className="font-bold text-slate-200 mb-1">{gene.name}</h3>
                                        <p className="text-xs text-slate-400 leading-relaxed mb-3 h-10">{gene.description}</p>
                                        <div className="flex justify-between items-center text-[10px] font-mono text-slate-500">
                                            <span>v{gene.version}</span>
                                            <span className="text-slate-400">Author: {gene.author}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </>
                    ) : (
                        <>
                            <div className="flex justify-between items-center mb-6">
                                <h2 className="text-sm font-bold text-purple-400 uppercase tracking-widest flex items-center gap-2">
                                    <Globe className="w-4 h-4" /> The Collective (Shared Skills)
                                </h2>
                                <span className="text-xs text-slate-500">Available: {globalGenes.length}</span>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {globalGenes.map(gene => {
                                    const isInstalled = localGenes.some(l => l.name === gene.name);
                                    return (
                                        <div 
                                            key={gene.id} 
                                            className="relative p-5 rounded-2xl border border-purple-500/20 bg-purple-900/5 hover:border-purple-500/50 transition-all duration-300"
                                        >
                                            <div className="flex justify-between items-start mb-3">
                                                <div className="p-2 rounded-lg bg-purple-500/10 text-purple-400">
                                                    <Users className="w-5 h-5" />
                                                </div>
                                                <div className="flex flex-col items-end">
                                                    <span className="text-[10px] text-slate-500 flex items-center gap-1">
                                                        <Download className="w-3 h-3" /> {gene.popularity}
                                                    </span>
                                                </div>
                                            </div>
                                            <h3 className="font-bold text-slate-200 mb-1">{gene.name}</h3>
                                            <p className="text-xs text-slate-400 leading-relaxed mb-3 h-10">{gene.description}</p>
                                            
                                            {isInstalled ? (
                                                <button disabled className="w-full py-2 rounded bg-slate-800 text-emerald-500 text-xs font-bold border border-slate-700 flex items-center justify-center gap-2">
                                                    <CheckCircle2 className="w-3 h-3" /> Installed
                                                </button>
                                            ) : (
                                                <button 
                                                    onClick={() => handleDownload(gene.id)}
                                                    disabled={gene.status === 'downloading'}
                                                    className="w-full py-2 rounded bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold transition-colors flex items-center justify-center gap-2"
                                                >
                                                    {gene.status === 'downloading' ? <Loader2 className="w-3 h-3 animate-spin" /> : <Download className="w-3 h-3" />}
                                                    {gene.status === 'downloading' ? 'Syncing...' : 'Install Skill'}
                                                </button>
                                            )}
                                            
                                            <div className="mt-2 text-[9px] text-center text-slate-600 font-mono">
                                                Authored by: {gene.author}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </>
                    )}
                </div>

                {/* Right: Evolution Panel */}
                <div className="w-[400px] bg-slate-900 border-l border-slate-800 flex flex-col shadow-2xl">
                    <div className="p-6 border-b border-slate-800 bg-slate-900/50">
                        <h3 className="text-sm font-bold text-white uppercase tracking-widest flex items-center gap-2">
                            <Microscope className="w-4 h-4 text-orange-400" /> Evolution Chamber
                        </h3>
                    </div>

                    <div className="flex-1 p-6 flex flex-col gap-6 overflow-y-auto">
                        {/* Status Display */}
                        {isEvolving ? (
                            <div className="flex-1 flex flex-col items-center justify-center text-center space-y-6">
                                <div className="relative">
                                    <div className="w-32 h-32 rounded-full border-4 border-slate-800 flex items-center justify-center relative">
                                        <div className={`absolute inset-0 rounded-full border-4 border-forge-accent border-t-transparent animate-spin ${evolutionStage >= 3 ? 'hidden' : ''}`}></div>
                                        <Dna className={`w-12 h-12 ${evolutionStage === 3 ? 'text-emerald-400' : 'text-slate-600'}`} />
                                    </div>
                                    <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-slate-900 px-3 py-1 rounded-full border border-slate-700 text-xs font-mono text-forge-accent">
                                        STAGE {evolutionStage}/3
                                    </div>
                                </div>
                                
                                <div className="space-y-1">
                                    <div className={`text-sm font-bold transition-colors ${evolutionStage >= 1 ? 'text-white' : 'text-slate-600'}`}>1. Sequencing DNA...</div>
                                    <div className={`text-sm font-bold transition-colors ${evolutionStage >= 2 ? 'text-white' : 'text-slate-600'}`}>2. Synthesizing Logic...</div>
                                    <div className={`text-sm font-bold transition-colors ${evolutionStage >= 3 ? 'text-white' : 'text-slate-600'}`}>3. Verification...</div>
                                </div>

                                {evolutionStage === 3 && (
                                    <div className="w-full bg-black rounded-lg border border-slate-700 p-4 text-left animate-fade-in">
                                        <div className="flex justify-between items-center mb-2">
                                            <span className="text-xs font-bold text-emerald-400">{newGeneName}</span>
                                            <Code className="w-3 h-3 text-slate-500" />
                                        </div>
                                        <pre className="text-[10px] font-mono text-slate-400 overflow-x-auto max-h-40 custom-scrollbar">
                                            {generatedCode}
                                        </pre>
                                        <button 
                                            onClick={handleIntegrate}
                                            className="w-full mt-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded flex items-center justify-center gap-2 transition-colors"
                                        >
                                            <CheckCircle2 className="w-4 h-4" /> Integrate Locally
                                        </button>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="flex-1 flex flex-col">
                                <div className="bg-gradient-to-br from-orange-900/20 to-red-900/20 rounded-xl p-6 border border-white/5 mb-6">
                                    <h4 className="text-lg font-bold text-white mb-2">Mutate Capabilities</h4>
                                    <p className="text-sm text-slate-400 mb-4">
                                        Describe a new skill. Mossy will generate the logic locally. You can verify it before installation or sharing.
                                    </p>
                                    <div className="flex flex-wrap gap-2">
                                        <span className="text-[10px] bg-slate-800 px-2 py-1 rounded text-slate-400 border border-slate-700">Stock Analysis</span>
                                        <span className="text-[10px] bg-slate-800 px-2 py-1 rounded text-slate-400 border border-slate-700">File Sorting</span>
                                    </div>
                                </div>

                                <div className="mt-auto">
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Desired Trait Description</label>
                                    <textarea 
                                        className="w-full h-32 bg-black/50 border border-slate-700 rounded-xl p-4 text-sm text-white focus:outline-none focus:border-forge-accent resize-none mb-4"
                                        placeholder="e.g. 'Monitor local port 3000 and alert me if it closes' or 'Summarize daily news from RSS feed'..."
                                        value={prompt}
                                        onChange={(e) => setPrompt(e.target.value)}
                                    />
                                    <button 
                                        onClick={handleEvolve}
                                        disabled={!prompt}
                                        className="w-full py-4 bg-forge-accent hover:bg-sky-400 text-slate-900 font-bold rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-sky-500/20 disabled:opacity-50 disabled:cursor-not-allowed group"
                                    >
                                        <Zap className="w-5 h-5 fill-current group-hover:animate-pulse" />
                                        Initiate Evolution
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TheGenome;