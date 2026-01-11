import React, { useState, useEffect } from 'react';
import { GoogleGenAI } from "@google/genai";
import { FileText, PenTool, RefreshCw, Copy, Check, Upload, Feather, BookOpen, List, Code, Sparkles, Wand2, Globe } from 'lucide-react';

interface DocSection {
    id: string;
    title: string;
    content: string;
    type: 'markdown' | 'bbcode';
}

const TheScribe: React.FC = () => {
    const [modName, setModName] = useState('MyMod');
    const [version, setVersion] = useState('1.0.0');
    const [activeTab, setActiveTab] = useState<'readme' | 'changelog' | 'lore'>('readme');
    const [generatedContent, setGeneratedContent] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);
    const [copied, setCopied] = useState(false);
    const [tone, setTone] = useState<'Standard' | 'Immersive' | 'Technical'>('Standard');

    // Simulate reading project context
    useEffect(() => {
        const savedProject = localStorage.getItem('mossy_project');
        if (savedProject) {
            const proj = JSON.parse(savedProject);
            setModName(proj.name);
        }
    }, []);

    const handleGenerate = async () => {
        setIsGenerating(true);
        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            
            let prompt = "";
            let systemContext = `You are "The Scribe", a documentation assistant for Fallout 4 mods. Mod Name: "${modName}". Version: "${version}".`;

            if (activeTab === 'readme') {
                prompt = `${systemContext}
                Generate a comprehensive README.md file.
                Include:
                1. Introduction (Catchy hook).
                2. Features (Bulleted list, assume it adds weapons/quests/settlement objects based on the name).
                3. Requirements (Assume F4SE and base Fallout 4).
                4. Installation (Mod Organizer 2 / Vortex instructions).
                5. Credits.
                Tone: ${tone}.`;
            } else if (activeTab === 'changelog') {
                prompt = `${systemContext}
                Generate a changelog for version ${version}.
                Invent 3-5 realistic bug fixes (e.g. Navmesh, Textures, Papyrus scripts) and 1 major new feature suitable for a Fallout 4 mod named "${modName}".
                Format as a clean list.`;
            } else if (activeTab === 'lore') {
                prompt = `${systemContext}
                Write an immersive, in-universe description of this mod's content.
                Style: Terminal Entry (RobCo Termlink) or a Holotape Transcript found in the Commonwealth.
                Make it atmospheric, mentioning specific Fallout 4 locations or factions if relevant (Institute, Brotherhood, Railroad).`;
            }

            const response = await ai.models.generateContent({
                model: 'gemini-3-flash-preview',
                contents: prompt,
            });

            setGeneratedContent(response.text);

        } catch (e) {
            setGeneratedContent("Error: Ink pot empty. (AI Generation Failed)");
        } finally {
            setIsGenerating(false);
        }
    };

    const handleCopy = () => {
        navigator.clipboard.writeText(generatedContent);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="h-full flex flex-col bg-[#0c0a09] text-slate-200 font-serif">
            {/* Header */}
            <div className="p-4 border-b border-stone-800 bg-[#1c1917] flex justify-between items-center shadow-md z-10 font-sans">
                <div>
                    <h2 className="text-xl font-bold text-stone-200 flex items-center gap-3">
                        <Feather className="w-6 h-6 text-amber-500" />
                        The Scribe
                    </h2>
                    <p className="text-xs text-stone-500 font-mono mt-1">Documentation & Publishing Assistant</p>
                </div>
                <div className="flex gap-2">
                    <div className="flex bg-stone-900 rounded-lg p-1 border border-stone-800">
                        <button 
                            onClick={() => setActiveTab('readme')}
                            className={`px-3 py-1.5 rounded text-xs font-bold transition-all ${activeTab === 'readme' ? 'bg-amber-700 text-white' : 'text-stone-500 hover:text-stone-300'}`}
                        >
                            ReadMe
                        </button>
                        <button 
                            onClick={() => setActiveTab('changelog')}
                            className={`px-3 py-1.5 rounded text-xs font-bold transition-all ${activeTab === 'changelog' ? 'bg-amber-700 text-white' : 'text-stone-500 hover:text-stone-300'}`}
                        >
                            Changelog
                        </button>
                        <button 
                            onClick={() => setActiveTab('lore')}
                            className={`px-3 py-1.5 rounded text-xs font-bold transition-all flex items-center gap-1 ${activeTab === 'lore' ? 'bg-purple-700 text-white' : 'text-stone-500 hover:text-stone-300'}`}
                        >
                            <Sparkles className="w-3 h-3" /> Lore
                        </button>
                    </div>
                </div>
            </div>

            <div className="flex-1 flex overflow-hidden">
                {/* Left: Configuration */}
                <div className="w-72 bg-[#171717] border-r border-stone-800 flex flex-col font-sans">
                    <div className="p-4 border-b border-stone-800 text-xs font-bold text-stone-500 uppercase tracking-widest">
                        Metadata
                    </div>
                    <div className="p-4 space-y-6">
                        <div>
                            <label className="block text-xs font-bold text-stone-400 mb-1">Project Name</label>
                            <input 
                                type="text" 
                                value={modName} 
                                onChange={(e) => setModName(e.target.value)}
                                className="w-full bg-stone-900 border border-stone-700 rounded px-3 py-2 text-sm text-stone-200 focus:border-amber-600 outline-none"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-stone-400 mb-1">Version</label>
                            <input 
                                type="text" 
                                value={version} 
                                onChange={(e) => setVersion(e.target.value)}
                                className="w-full bg-stone-900 border border-stone-700 rounded px-3 py-2 text-sm text-stone-200 focus:border-amber-600 outline-none"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-stone-400 mb-1">Tone</label>
                            <select 
                                value={tone} 
                                onChange={(e) => setTone(e.target.value as any)}
                                className="w-full bg-stone-900 border border-stone-700 rounded px-3 py-2 text-sm text-stone-200 focus:border-amber-600 outline-none"
                            >
                                <option>Standard</option>
                                <option>Immersive</option>
                                <option>Technical</option>
                                <option>Hype / Marketing</option>
                            </select>
                        </div>

                        <div className="p-4 bg-stone-900/50 rounded-xl border border-stone-800">
                            <h4 className="text-xs font-bold text-stone-400 mb-2 flex items-center gap-2">
                                <List className="w-3 h-3" /> Auto-Detected
                            </h4>
                            <div className="space-y-1">
                                <div className="flex items-center gap-2 text-xs text-stone-500">
                                    <Check className="w-3 h-3 text-emerald-500" /> F4SE Dependency
                                </div>
                                <div className="flex items-center gap-2 text-xs text-stone-500">
                                    <Check className="w-3 h-3 text-emerald-500" /> 3 New Scripts
                                </div>
                                <div className="flex items-center gap-2 text-xs text-stone-500">
                                    <Check className="w-3 h-3 text-emerald-500" /> 2 Modified Cells
                                </div>
                            </div>
                        </div>

                        <button 
                            onClick={handleGenerate}
                            disabled={isGenerating}
                            className="w-full py-3 bg-amber-700 hover:bg-amber-600 text-white font-bold rounded-lg transition-all shadow-lg flex items-center justify-center gap-2 disabled:opacity-50"
                        >
                            {isGenerating ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
                            {isGenerating ? 'Writing...' : 'Generate Draft'}
                        </button>
                    </div>
                </div>

                {/* Right: Editor */}
                <div className="flex-1 bg-[#121212] relative flex flex-col">
                    <div className="flex-1 p-8 overflow-y-auto custom-scrollbar">
                        {generatedContent ? (
                            <div className="max-w-3xl mx-auto bg-stone-900/50 border border-stone-800 rounded-sm p-8 shadow-2xl relative">
                                <button 
                                    onClick={handleCopy}
                                    className="absolute top-4 right-4 p-2 hover:bg-stone-800 rounded text-stone-500 hover:text-white transition-colors"
                                    title="Copy to Clipboard"
                                >
                                    {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                                </button>
                                
                                <textarea 
                                    value={generatedContent}
                                    onChange={(e) => setGeneratedContent(e.target.value)}
                                    className="w-full h-[600px] bg-transparent border-none focus:ring-0 text-stone-300 font-mono text-sm resize-none leading-relaxed"
                                    spellCheck={false}
                                />
                            </div>
                        ) : (
                            <div className="h-full flex flex-col items-center justify-center text-stone-700 gap-4">
                                <BookOpen className="w-16 h-16 opacity-20" />
                                <p className="font-sans text-sm">Ready to chronicle your work.</p>
                            </div>
                        )}
                    </div>

                    {/* Footer */}
                    <div className="p-4 border-t border-stone-800 bg-[#1c1917] flex justify-between items-center font-sans">
                        <div className="text-xs text-stone-500">
                            {generatedContent.length} characters
                        </div>
                        <div className="flex gap-2">
                            <button className="flex items-center gap-2 px-4 py-2 bg-stone-800 hover:bg-stone-700 text-stone-300 rounded text-xs font-bold transition-colors">
                                <Code className="w-3 h-3" /> Copy BBCode
                            </button>
                            <button className="flex items-center gap-2 px-4 py-2 bg-stone-800 hover:bg-stone-700 text-stone-300 rounded text-xs font-bold transition-colors">
                                <FileText className="w-3 h-3" /> Copy Markdown
                            </button>
                            <button className="flex items-center gap-2 px-4 py-2 bg-orange-700 hover:bg-orange-600 text-white rounded text-xs font-bold transition-colors shadow-lg">
                                <Upload className="w-3 h-3" /> Publish to Nexus
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TheScribe;