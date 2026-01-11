import React, { useState, useEffect } from 'react';
import { GoogleGenAI } from "@google/genai";
import { Library, Folder, File, AlertTriangle, Play, Settings, RefreshCw, Zap, ArrowDown, ArrowUp, Minus, Plus, Search, Layers, Database, Check, Wrench, Download, Box, Link, MapPin, BookOpen, Scroll, Flag, Lock } from 'lucide-react';

interface QuestStage {
    id: number;
    log: string;
    completed: boolean;
}

interface SpawnLocation {
    cell: string;
    refId: string;
    coords: string;
}

interface Mod {
    id: string;
    name: string;
    version: string;
    category: string;
    enabled: boolean;
    priority: number; // The visual load order in left pane
    conflicts: {
        overwrites: string[]; // IDs of mods this one overwrites
        overwrittenBy: string[]; // IDs of mods that overwrite this one
    };
    files: string[]; // Simulated file list
    // Quest Mod Specifics
    questData?: {
        storyArc: QuestStage[];
        locations: SpawnLocation[];
    };
}

interface Utility {
    id: string;
    name: string;
    description: string;
    isInstalled: boolean;
    isRequired: boolean; // Recommended vs Essential
    path?: string;
}

const initialMods: Mod[] = [
    { 
        id: 'dlc', name: 'DLC: Automatron', version: '1.0', category: 'DLC', enabled: true, priority: 0, 
        conflicts: { overwrites: [], overwrittenBy: [] }, 
        files: ['DLCRobot.esm', 'DLCRobot - Main.ba2'] 
    },
    { 
        id: 'ufo4p', name: 'Unofficial Fallout 4 Patch', version: '2.1.5', category: 'Bug Fixes', enabled: true, priority: 1, 
        conflicts: { overwrites: [], overwrittenBy: ['texture_opt'] }, 
        files: ['Unofficial Fallout 4 Patch.esp', 'Unofficial Fallout 4 Patch - Main.ba2'] 
    },
    { 
        id: 'ppf', name: 'PPF.esm', version: '4.0', category: 'Framework', enabled: true, priority: 2, 
        conflicts: { overwrites: [], overwrittenBy: [] }, 
        files: ['PPF.esm'] 
    },
    { 
        id: 'cbbe', name: 'Caliente\'s Beautiful Bodies Enhancer', version: '2.6.3', category: 'Models/Textures', enabled: true, priority: 3, 
        conflicts: { overwrites: [], overwrittenBy: ['skin_texture'] }, 
        files: ['Meshes/Character/Female/FemaleBody.nif', 'Textures/Actors/Character/BaseHumanFemale/FemaleBody_d.dds'] 
    },
    { 
        id: 'vivid', name: 'Vivid Fallout - All in One', version: '1.9', category: 'Environment', enabled: true, priority: 4, 
        conflicts: { overwrites: [], overwrittenBy: ['better_roads'] }, 
        files: ['Textures/Landscape/Ground/Dirt01_d.dds', 'Textures/Landscape/Roads/Road01_d.dds'] 
    },
    { 
        id: 'better_roads', name: 'Better Roads', version: '1.0', category: 'Environment', enabled: true, priority: 5, 
        conflicts: { overwrites: ['vivid'], overwrittenBy: [] }, 
        files: ['Textures/Landscape/Roads/Road01_d.dds'] // This conflicts with vivid
    },
    { 
        id: 'skin_texture', name: 'Valkyr Female Face Texture', version: '1.0', category: 'Models/Textures', enabled: true, priority: 6, 
        conflicts: { overwrites: ['cbbe'], overwrittenBy: [] }, 
        files: ['Textures/Actors/Character/BaseHumanFemale/FemaleHead_d.dds'] 
    },
    { 
        id: 'tales_commonwealth', name: 'Tales from the Commonwealth', version: '3.02', category: 'Quest', enabled: true, priority: 50,
        conflicts: { overwrites: [], overwrittenBy: [] },
        files: ['3DNPC_FO4.esp', '3DNPC_FO4 - Main.ba2', '3DNPC_FO4 - Textures.ba2'],
        questData: {
            storyArc: [
                { id: 10, log: "Listen to the radio broadcast.", completed: true },
                { id: 20, log: "Find Birdie at the Dugout Inn.", completed: false },
                { id: 30, log: "Retrieve the stolen holotape.", completed: false },
                { id: 40, log: "Decide Birdie's fate.", completed: false }
            ],
            locations: [
                { cell: "DiamondCityDugoutInn", refId: "xx001A2B", coords: "Interior" },
                { cell: "Wilderness", refId: "xx004F33", coords: "-12, 18" },
                { cell: "GoodneighborWarehouses", refId: "xx009C11", coords: "Interior" }
            ]
        }
    },
    { 
        id: 'sim_settlements_2', name: 'Sim Settlements 2', version: '3.3.4', category: 'Quest', enabled: true, priority: 51,
        conflicts: { overwrites: [], overwrittenBy: [] },
        files: ['SS2.esm', 'SS2 - Main.ba2'],
        questData: {
            storyArc: [
                { id: 10, log: "Meet the Stranger in Concord.", completed: true },
                { id: 15, log: "Build a Recruitment Beacon.", completed: true },
                { id: 20, log: "Construct 5 Residential Plots.", completed: true },
                { id: 30, log: "Defend Sanctuary from Raiders.", completed: false }
            ],
            locations: [
                { cell: "ConcordExt", refId: "xx000888", coords: "-10, -8" },
                { cell: "SanctuaryHillsWorld", refId: "xx000999", coords: "-15, 22" }
            ]
        }
    },
    { 
        id: 'prp', name: 'Previsibines Repair Pack (PRP)', version: '0.69.8', category: 'Optimization', enabled: true, priority: 99, 
        conflicts: { overwrites: ['vivid', 'better_roads'], overwrittenBy: [] }, 
        files: ['PRP.esp', 'PRP-Compat.esp'] 
    },
];

const initialUtilities: Utility[] = [
    { id: 'f4se', name: 'F4SE', description: 'Script Extender', isInstalled: true, isRequired: true, path: 'Fallout 4/f4se_loader.exe' },
    { id: 'ck', name: 'Creation Kit', description: 'Official Editor', isInstalled: false, isRequired: false },
    { id: 'xedit', name: 'FO4Edit', description: 'Conflict Resolution', isInstalled: true, isRequired: true, path: 'Tools/FO4Edit.exe' },
    { id: 'bodyslide', name: 'BodySlide', description: 'Mesh Generator', isInstalled: true, isRequired: true, path: 'Tools/BodySlide x64.exe' },
    { id: 'nifskope', name: 'NifSkope 2.0 Dev 11', description: 'NIF Mesh Editor (Modern)', isInstalled: false, isRequired: false },
    { id: 'loot', name: 'LOOT', description: 'Load Order Tool', isInstalled: false, isRequired: false },
];

const TheOrganizer: React.FC = () => {
    const [mods, setMods] = useState<Mod[]>(initialMods);
    const [utilities, setUtilities] = useState<Utility[]>(initialUtilities);
    const [selectedModId, setSelectedModId] = useState<string | null>(null);
    const [filter, setFilter] = useState('');
    const [isSorting, setIsSorting] = useState(false);
    const [activeTab, setActiveTab] = useState<'mods' | 'quests' | 'utils'>('mods');
    const [analysisResult, setAnalysisResult] = useState<string | null>(null);

    const selectedMod = mods.find(m => m.id === selectedModId);

    // Simulate scanning on load
    useEffect(() => {
        const bridgeActive = localStorage.getItem('mossy_bridge_active') === 'true';
        if (bridgeActive) {
            setUtilities(prev => prev.map(u => ({...u, isInstalled: Math.random() > 0.3})));
        }
    }, []);

    const handleToggle = (id: string) => {
        setMods(prev => prev.map(m => m.id === id ? { ...m, enabled: !m.enabled } : m));
    };

    const handleSort = async () => {
        setIsSorting(true);
        setAnalysisResult(null);

        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            
            const modList = mods.map(m => `${m.name} [Category: ${m.category}]`).join('\n');
            
            const prompt = `
            Act as LOOT (Load Order Optimization Tool).
            Analyze this list of Fallout 4 mods and suggest an optimal load order priority (0 is top/first loaded, highest number is bottom/last loaded).
            Mods:
            ${modList}
            
            Rules:
            1. DLC and Unofficial Patches must be at the top.
            2. Large texture packs (Vivid) lower than base game but higher than specific replacers.
            3. Quest mods should be loaded after environment overhauls but before patches.
            4. PRP MUST be loaded LAST.
            
            Return JSON: array of mod names in correct order.
            `;

            const response = await ai.models.generateContent({
                model: 'gemini-3-flash-preview',
                contents: prompt,
                config: { responseMimeType: 'application/json' }
            });

            const sortedNames: string[] = JSON.parse(response.text);
            
            setMods(prev => {
                const newMods = [...prev];
                newMods.sort((a, b) => {
                    const idxA = sortedNames.findIndex(n => n.includes(a.name));
                    const idxB = sortedNames.findIndex(n => n.includes(b.name));
                    return (idxA === -1 ? 999 : idxA) - (idxB === -1 ? 999 : idxB);
                });
                return newMods.map((m, i) => ({ ...m, priority: i }));
            });
            
            setAnalysisResult("Load order sorted. Quest priorities optimized.");

        } catch (e) {
            console.error(e);
            setAnalysisResult("Sort failed. Neural network timeout.");
        } finally {
            setIsSorting(false);
        }
    };

    // Helper to get conflicting mod names
    const getModName = (id: string) => mods.find(m => m.id === id)?.name || id;

    // Filter Logic
    const displayedMods = mods.filter(m => {
        const matchesSearch = m.name.toLowerCase().includes(filter.toLowerCase());
        const matchesCategory = activeTab === 'quests' ? m.category === 'Quest' : true;
        return matchesSearch && matchesCategory;
    }).sort((a, b) => a.priority - b.priority);

    return (
        <div className="h-full flex flex-col bg-[#1e1e1e] text-slate-200 font-sans text-sm">
            {/* Toolbar */}
            <div className="p-3 border-b border-black bg-[#2d2d2d] flex justify-between items-center shadow-md">
                <div className="flex items-center gap-4">
                    <h2 className="text-lg font-bold text-white flex items-center gap-2">
                        <Library className="w-5 h-5 text-forge-accent" />
                        The Organizer
                    </h2>
                    <div className="h-6 w-px bg-slate-600"></div>
                    <div className="flex items-center gap-2">
                        <button 
                            onClick={() => { setActiveTab('mods'); setSelectedModId(null); }}
                            className={`px-3 py-1 rounded text-xs font-bold transition-all ${activeTab === 'mods' ? 'bg-[#094771] text-white' : 'hover:bg-slate-700 text-slate-400'}`}
                        >
                            Mods
                        </button>
                        <button 
                            onClick={() => { setActiveTab('quests'); setSelectedModId(null); }}
                            className={`px-3 py-1 rounded text-xs font-bold transition-all flex items-center gap-1 ${activeTab === 'quests' ? 'bg-[#094771] text-white' : 'hover:bg-slate-700 text-slate-400'}`}
                        >
                            <Scroll className="w-3 h-3" /> Quest Projects
                        </button>
                        <button 
                            onClick={() => { setActiveTab('utils'); setSelectedModId(null); }}
                            className={`px-3 py-1 rounded text-xs font-bold transition-all ${activeTab === 'utils' ? 'bg-[#094771] text-white' : 'hover:bg-slate-700 text-slate-400'}`}
                        >
                            Executables
                        </button>
                    </div>
                </div>
                
                <div className="flex items-center gap-2">
                    <div className="relative opacity-80 cursor-not-allowed" title="Context Locked">
                        <Play className="w-4 h-4 text-green-500 absolute left-2 top-1.5" />
                        <div className="bg-[#1e1e1e] border border-slate-600 rounded pl-8 pr-2 py-1 text-xs text-white w-48 font-bold flex items-center justify-between">
                            <span>Fallout 4</span>
                            <Lock className="w-3 h-3 text-slate-500" />
                        </div>
                    </div>
                    <button className="px-4 py-1 bg-gradient-to-b from-slate-700 to-slate-800 border border-slate-600 rounded text-xs font-bold hover:from-slate-600 hover:to-slate-700">Run</button>
                    {activeTab !== 'utils' && (
                        <>
                            <div className="h-6 w-px bg-slate-600 mx-2"></div>
                            <button 
                                onClick={handleSort}
                                disabled={isSorting}
                                className="px-3 py-1 bg-slate-700 hover:bg-slate-600 border border-slate-500 rounded text-xs flex items-center gap-2 transition-colors disabled:opacity-50"
                            >
                                {isSorting ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Zap className="w-3 h-3 text-yellow-400" />}
                                Sort
                            </button>
                        </>
                    )}
                </div>
            </div>

            <div className="flex-1 flex overflow-hidden">
                {activeTab !== 'utils' ? (
                    <>
                        {/* Left Pane: Mod List */}
                        <div className="flex-1 flex flex-col min-w-0 border-r border-black bg-[#252526]">
                            {/* Filter Bar */}
                            <div className="p-2 border-b border-black flex gap-2">
                                <div className="relative flex-1">
                                    <Search className="w-3 h-3 absolute left-2 top-2 text-slate-500" />
                                    <input 
                                        type="text" 
                                        placeholder="Filter mods..." 
                                        value={filter}
                                        onChange={(e) => setFilter(e.target.value)}
                                        className="w-full bg-[#1e1e1e] border border-slate-600 rounded pl-7 pr-2 py-1 text-xs focus:outline-none focus:border-forge-accent"
                                    />
                                </div>
                            </div>

                            {/* Header Row */}
                            <div className="grid grid-cols-[40px_1fr_100px_40px] bg-[#333333] text-[10px] text-slate-300 font-bold border-b border-black p-1 select-none">
                                <div className="text-center">Priority</div>
                                <div className="pl-2">Mod Name</div>
                                <div>Category</div>
                                <div className="text-center">Flags</div>
                            </div>

                            {/* Mod Rows */}
                            <div className="flex-1 overflow-y-auto custom-scrollbar">
                                {displayedMods.map((mod) => (
                                    <div 
                                        key={mod.id}
                                        onClick={() => setSelectedModId(mod.id)}
                                        className={`grid grid-cols-[40px_1fr_100px_40px] items-center p-1 border-b border-[#2a2a2a] cursor-pointer hover:bg-[#2a2d3e] text-xs transition-colors ${
                                            selectedModId === mod.id ? 'bg-[#094771] text-white hover:bg-[#094771]' : 
                                            !mod.enabled ? 'text-slate-500 italic' : 'text-slate-200'
                                        }`}
                                    >
                                        <div className="text-center font-mono text-slate-500">{mod.priority}</div>
                                        <div className="flex items-center gap-2 pl-2 overflow-hidden">
                                            <input 
                                                type="checkbox" 
                                                checked={mod.enabled}
                                                onChange={(e) => {
                                                    e.stopPropagation();
                                                    handleToggle(mod.id);
                                                }}
                                                className="w-3 h-3 rounded-sm border-slate-600 bg-[#1e1e1e]"
                                            />
                                            <span className="truncate">{mod.name}</span>
                                        </div>
                                        <div className="text-[10px] text-slate-400 truncate">{mod.category}</div>
                                        <div className="flex justify-center gap-1">
                                            {mod.category === 'Quest' && <Scroll className="w-3 h-3 text-purple-400" />}
                                            {mod.conflicts.overwrites.length > 0 && <span className="text-green-500 text-[10px] font-bold">+</span>}
                                            {mod.conflicts.overwrittenBy.length > 0 && <span className="text-red-500 text-[10px] font-bold">-</span>}
                                        </div>
                                    </div>
                                ))}
                            </div>
                            
                            <div className="p-1 bg-[#333333] border-t border-black text-[10px] text-slate-400 text-center">
                                Showing: {displayedMods.length} {activeTab === 'quests' ? 'Quest Mods' : 'Active Mods'}
                            </div>
                        </div>

                        {/* Right Pane: Details */}
                        <div className="w-96 bg-[#1e1e1e] flex flex-col">
                            {selectedMod ? (
                                <>
                                    <div className="p-3 border-b border-black bg-[#2d2d2d] font-bold text-slate-200 truncate" title={selectedMod.name}>
                                        {selectedMod.name}
                                    </div>
                                    
                                    {/* Tabs */}
                                    <div className="flex border-b border-black text-xs">
                                        <div className={`px-3 py-1.5 cursor-pointer border-t-2 ${activeTab === 'quests' && selectedMod.category === 'Quest' ? 'bg-[#1e1e1e] text-slate-200 border-forge-accent' : 'bg-[#252526] text-slate-500 border-transparent'}`}>
                                            {selectedMod.category === 'Quest' ? 'Story Board' : 'Conflicts'}
                                        </div>
                                        <div className="px-3 py-1.5 bg-[#252526] text-slate-500 border-t-2 border-transparent hover:text-slate-300 cursor-pointer">Files</div>
                                        {selectedMod.category === 'Quest' && <div className="px-3 py-1.5 bg-[#1e1e1e] text-slate-200 border-t-2 border-purple-500">Locations</div>}
                                    </div>

                                    <div className="flex-1 overflow-y-auto p-4 space-y-6">
                                        {/* Quest View */}
                                        {activeTab === 'quests' && selectedMod.questData ? (
                                            <>
                                                <div>
                                                    <h4 className="text-[10px] font-bold text-purple-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                                                        <BookOpen className="w-3 h-3" /> Narrative Flow
                                                    </h4>
                                                    <div className="space-y-3 relative pl-4 border-l border-slate-700 ml-1">
                                                        {selectedMod.questData.storyArc.map((stage) => (
                                                            <div key={stage.id} className="relative">
                                                                <div className={`absolute -left-[21px] top-1 w-3 h-3 rounded-full border-2 border-[#1e1e1e] ${stage.completed ? 'bg-emerald-500' : 'bg-slate-600'}`}></div>
                                                                <div className="text-xs font-bold text-slate-300">Stage {stage.id}</div>
                                                                <div className="text-[11px] text-slate-400">{stage.log}</div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>

                                                <div>
                                                    <h4 className="text-[10px] font-bold text-orange-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                                                        <MapPin className="w-3 h-3" /> Spawn Locations
                                                    </h4>
                                                    <div className="space-y-2">
                                                        {selectedMod.questData.locations.map((loc, i) => (
                                                            <div key={i} className="bg-[#252526] p-2 rounded border border-slate-700 flex justify-between items-center group">
                                                                <div>
                                                                    <div className="text-xs font-bold text-slate-300">{loc.cell}</div>
                                                                    <div className="text-[10px] font-mono text-slate-500">{loc.coords} | {loc.refId}</div>
                                                                </div>
                                                                <button className="text-xs text-blue-400 opacity-0 group-hover:opacity-100 hover:underline">
                                                                    View
                                                                </button>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            </>
                                        ) : (
                                            /* Standard View */
                                            <>
                                                <div>
                                                    <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 flex items-center gap-2">
                                                        <ArrowDown className="w-3 h-3 text-red-500" /> Overwritten By (Loser)
                                                    </h4>
                                                    {selectedMod.conflicts.overwrittenBy.length > 0 ? (
                                                        <div className="space-y-1">
                                                            {selectedMod.conflicts.overwrittenBy.map(id => (
                                                                <div key={id} className="flex items-center gap-2 p-2 bg-red-900/10 border border-red-900/30 rounded text-xs text-red-200">
                                                                    <Layers className="w-3 h-3" />
                                                                    {getModName(id)}
                                                                </div>
                                                            ))}
                                                        </div>
                                                    ) : (
                                                        <div className="text-xs text-slate-600 italic">No mods overwrite this one.</div>
                                                    )}
                                                </div>

                                                <div>
                                                    <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 flex items-center gap-2">
                                                        <ArrowUp className="w-3 h-3 text-green-500" /> Overwrites (Winner)
                                                    </h4>
                                                    {selectedMod.conflicts.overwrites.length > 0 ? (
                                                        <div className="space-y-1">
                                                            {selectedMod.conflicts.overwrites.map(id => (
                                                                <div key={id} className="flex items-center gap-2 p-2 bg-green-900/10 border border-green-900/30 rounded text-xs text-green-200">
                                                                    <Layers className="w-3 h-3" />
                                                                    {getModName(id)}
                                                                </div>
                                                            ))}
                                                        </div>
                                                    ) : (
                                                        <div className="text-xs text-slate-600 italic">This mod does not overwrite others.</div>
                                                    )}
                                                </div>

                                                <div>
                                                    <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 flex items-center gap-2">
                                                        <Database className="w-3 h-3" /> VFS Preview
                                                    </h4>
                                                    <div className="bg-black border border-slate-700 rounded p-2 text-[10px] font-mono text-slate-400 overflow-x-auto">
                                                        {selectedMod.files.map((f, i) => (
                                                            <div key={i} className="flex items-center gap-1">
                                                                <File className="w-3 h-3 text-slate-600" />
                                                                {f}
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                </>
                            ) : (
                                <div className="flex-1 flex flex-col items-center justify-center text-slate-600 p-6 text-center">
                                    <Layers className="w-12 h-12 mb-4 opacity-20" />
                                    <p className="text-sm">Select a mod to view details.</p>
                                </div>
                            )}
                            
                            {/* Status Bar for Right Pane */}
                            {analysisResult && (
                                <div className="p-2 bg-slate-800 border-t border-black text-xs text-green-400 flex items-center gap-2 animate-fade-in">
                                    <Check className="w-3 h-3" />
                                    {analysisResult}
                                </div>
                            )}
                        </div>
                    </>
                ) : (
                    // UTILITIES TAB
                    <div className="flex-1 bg-[#1b1b1b] p-8 overflow-y-auto">
                        <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-3">
                            <Wrench className="w-6 h-6 text-forge-accent" /> Tool Dashboard
                        </h2>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {utilities.map(tool => (
                                <div key={tool.id} className={`p-6 rounded-xl border-2 transition-all group ${tool.isInstalled ? 'bg-slate-800 border-slate-700' : 'bg-slate-900 border-dashed border-slate-700 opacity-80'}`}>
                                    <div className="flex justify-between items-start mb-4">
                                        <div className={`p-3 rounded-lg ${tool.isInstalled ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
                                            {tool.id === 'f4se' ? <Zap className="w-6 h-6" /> : 
                                             tool.id === 'ck' ? <Box className="w-6 h-6" /> : 
                                             tool.id === 'xedit' ? <Database className="w-6 h-6" /> : 
                                             <Settings className="w-6 h-6" />}
                                        </div>
                                        {tool.isInstalled ? (
                                            <div className="px-2 py-1 rounded bg-emerald-900/30 text-emerald-400 text-xs font-bold flex items-center gap-1 border border-emerald-500/30">
                                                <Check className="w-3 h-3" /> Detected
                                            </div>
                                        ) : (
                                            tool.isRequired && (
                                                <div className="px-2 py-1 rounded bg-yellow-900/30 text-yellow-400 text-xs font-bold border border-yellow-500/30">
                                                    Recommended
                                                </div>
                                            )
                                        )}
                                    </div>
                                    
                                    <h3 className="text-lg font-bold text-white mb-1">{tool.name}</h3>
                                    <p className="text-sm text-slate-400 mb-4 h-10">{tool.description}</p>
                                    
                                    {tool.isInstalled ? (
                                        <div className="text-xs font-mono text-slate-500 break-all bg-black/30 p-2 rounded border border-slate-700">
                                            Path: {tool.path}
                                        </div>
                                    ) : (
                                        <button className="w-full py-2 flex items-center justify-center gap-2 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded text-xs font-bold transition-colors">
                                            <Download className="w-3 h-3" /> Find Download
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default TheOrganizer;