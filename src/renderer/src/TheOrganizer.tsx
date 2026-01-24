import React, { useMemo, useState } from 'react';
import { BookOpen, Box, Check, Database, Download, Layers, Library, Lock, MapPin, Play, RefreshCw, Scroll, Search, Settings, Wrench, Zap } from 'lucide-react';

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
    priority: number;
    conflicts: {
        overwrites: string[];
        overwrittenBy: string[];
    };
    files: string[];
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
    isRequired: boolean;
    path?: string;
}

const essentialUtilities: Utility[] = [
    { id: 'f4se', name: 'Fallout 4 Script Extender (F4SE)', description: 'Essential for most advanced mods.', isRequired: true, isInstalled: false },
    { id: 'ck', name: 'Creation Kit', description: 'The official editor for Fallout 4.', isRequired: true, isInstalled: false },
    { id: 'xedit', name: 'FO4Edit (xEdit)', description: 'Tool for cleaning and resolving conflicts.', isRequired: true, isInstalled: false },
    { id: 'bodyslide', name: 'BodySlide', description: 'Mesh and character generation tool.', isInstalled: false, isRequired: true },
    { id: 'nifskope', name: 'NifSkope', description: 'NIF mesh editor.', isInstalled: false, isRequired: false },
    { id: 'loot', name: 'LOOT', description: 'Load order optimisation tool.', isInstalled: false, isRequired: false }
];

const initialMods: Mod[] = [
    {
        id: 'base',
        name: 'Fallout4.esm',
        version: '1.10.0',
        category: 'Base',
        enabled: true,
        priority: 0,
        conflicts: { overwrites: [], overwrittenBy: [] },
        files: ['Fallout4.esm']
    },
    {
        id: 'ufopatch',
        name: 'Unofficial Fallout 4 Patch',
        version: '2.1.2',
        category: 'Unofficial Patch',
        enabled: true,
        priority: 1,
        conflicts: { overwrites: ['base'], overwrittenBy: [] },
        files: ['UFO4P.esp']
    },
    {
        id: 'quest01',
        name: 'Vault Stories - Lexington Rising',
        version: '1.0.0',
        category: 'Quest',
        enabled: true,
        priority: 2,
        conflicts: { overwrites: [], overwrittenBy: [] },
        files: ['LexingtonRising.esm'],
        questData: {
            storyArc: [
                { id: 10, log: 'Investigate the strange radio signal near Lexington.', completed: true },
                { id: 20, log: 'Speak with the Vault-Tec engineer hiding in the ruins.', completed: false },
                { id: 30, log: 'Recover the prototype power regulator.', completed: false }
            ],
            locations: [
                { cell: 'LexingtonExt', refId: '0001ABCD', coords: 'X:12.4 Y:-3.1 Z:5.8' },
                { cell: 'Vault114', refId: '0002CDEF', coords: 'X:3.2 Y:1.5 Z:-1.2' }
            ]
        }
    }
];

const TheOrganizer: React.FC = () => {
    const api = (window as unknown as { electronAPI?: { openProgram?: (path: string) => Promise<{ success: boolean; error?: string }>; openExternal?: (path: string) => Promise<void>; }; }).electronAPI;
    const [mods, setMods] = useState<Mod[]>(initialMods);
    const [utilities] = useState<Utility[]>(essentialUtilities);
    const [activeTab, setActiveTab] = useState<'mods' | 'quests' | 'utils'>('mods');
    const [selectedModId, setSelectedModId] = useState<string | null>(initialMods[0]?.id ?? null);
    const [filter, setFilter] = useState('');
    const [analysisResult, setAnalysisResult] = useState<string | null>(null);
    const [isSorting, setIsSorting] = useState(false);

    const selectedMod = useMemo(
        () => mods.find(mod => mod.id === selectedModId) || mods[0],
        [mods, selectedModId]
    );

    const handleSort = () => {
        if (mods.length === 0) {
            setAnalysisResult('No mods detected to sort.');
            return;
        }

        setIsSorting(true);
        setAnalysisResult(null);

        const categoryPriority: Record<string, number> = {
            dlc: 0,
            'unofficial patch': 1,
            framework: 2,
            engine: 2,
            'mod manager': 2,
            texture: 3,
            overhaul: 4,
            quest: 5,
            gameplay: 5,
            patch: 6,
            esl: 7
        };

        const score = (mod: Mod) => {
            const cat = (mod.category || '').toLowerCase();
            const match = Object.entries(categoryPriority).find(([key]) => cat.includes(key));
            return match ? match[1] : 5;
        };

        const sortedMods = [...mods]
            .sort((a, b) => {
                const diff = score(a) - score(b);
                if (diff !== 0) return diff;
                return a.name.localeCompare(b.name);
            })
            .map((mod, idx) => ({ ...mod, priority: idx }));

        setMods(sortedMods);

        const summary = sortedMods
            .map(mod => `${mod.name} → ${mod.priority}`)
            .slice(0, 20)
            .join('\n');

        setAnalysisResult(`Local heuristic sort applied. Sample order:\n${summary}`);
        setIsSorting(false);
    };

    const handleLaunchUtility = async (path?: string, name?: string) => {
        if (!path) {
            alert('Desktop Bridge not available or no path provided.');
            return;
        }

        if (api?.openProgram) {
            try {
                const result = await api.openProgram(path);
                if (!result.success) {
                    alert(`Error launching ${name || 'Utility'}: ${result.error || 'The executable could not be started.'}`);
                }
            } catch (e) {
                alert(`Bridge error launching ${name || 'Utility'}: ${e instanceof Error ? e.message : 'Unknown error'}`);
            }
        } else if (api?.openExternal) {
            try {
                await api.openExternal(path);
            } catch (e) {
                alert(`Error launching ${name || 'Utility'}: ${e instanceof Error ? e.message : 'Unknown error'}`);
            }
        } else {
            alert('Desktop Bridge not available.');
        }
    };

    const handleToggle = (id: string) => {
        setMods(prev => prev.map(mod => (mod.id === id ? { ...mod, enabled: !mod.enabled } : mod)));
    };

    const displayedMods = useMemo(
        () =>
            mods
                .filter(mod => {
                    const matchesSearch = mod.name.toLowerCase().includes(filter.toLowerCase());
                    const matchesCategory = activeTab === 'quests' ? mod.category === 'Quest' : true;
                    return matchesSearch && matchesCategory;
                })
                .sort((a, b) => a.priority - b.priority),
        [mods, filter, activeTab]
    );

    const getModName = (id: string) => mods.find(mod => mod.id === id)?.name || id;

    return (
        <div className="h-full flex flex-col bg-[#1e1e1e] text-slate-200 font-sans text-sm">
            <div className="p-3 border-b border-black bg-[#2d2d2d] flex justify-between items-center shadow-md">
                <div className="flex items-center gap-4">
                    <h2 className="text-lg font-bold text-white flex items-center gap-2">
                        <Library className="w-5 h-5 text-forge-accent" />
                        The Organizer
                    </h2>
                    <div className="h-6 w-px bg-slate-600"></div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => {
                                setActiveTab('mods');
                                setSelectedModId(selectedMod?.id ?? null);
                            }}
                            className={`px-3 py-1 rounded text-xs font-bold transition-all ${activeTab === 'mods' ? 'bg-[#094771] text-white' : 'hover:bg-slate-700 text-slate-400'}`}
                        >
                            Mods
                        </button>
                        <button
                            onClick={() => {
                                setActiveTab('quests');
                                setSelectedModId(selectedMod?.id ?? null);
                            }}
                            className={`px-3 py-1 rounded text-xs font-bold transition-all flex items-around gap-1 ${activeTab === 'quests' ? 'bg-[#094771] text-white' : 'hover:bg-slate-700 text-slate-400'}`}
                        >
                            <Scroll className="w-3 h-3" /> Quest Projects
                        </button>
                        <button
                            onClick={() => {
                                setActiveTab('utils');
                                setSelectedModId(null);
                            }}
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
                        <div className="flex-1 flex flex-col min-w-0 border-r border-black bg-[#252526]">
                            <div className="p-2 border-b border-black flex gap-2">
                                <div className="relative flex-1">
                                    <Search className="w-3 h-3 absolute left-2 top-2 text-slate-500" />
                                    <input
                                        type="text"
                                        placeholder="Filter mods..."
                                        value={filter}
                                        onChange={e => setFilter(e.target.value)}
                                        className="w-full bg-[#1e1e1e] border border-slate-600 rounded pl-7 pr-2 py-1 text-xs focus:outline-none focus:border-forge-accent"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-[40px_1fr_100px_40px] bg-[#333333] text-[10px] text-slate-300 font-bold border-b border-black p-1 select-none">
                                <div className="text-center">Order</div>
                                <div className="pl-2">Mod Name</div>
                                <div>Category</div>
                                <div className="text-center">Flags</div>
                            </div>

                            <div className="flex-1 overflow-y-auto custom-scrollbar">
                                {displayedMods.length > 0 ? (
                                    displayedMods.map(mod => (
                                        <div
                                            key={mod.id}
                                            onClick={() => setSelectedModId(mod.id)}
                                            className={`grid grid-cols-[40px_1fr_100px_40px] items-center p-1 border-b border-[#2a2a2a] cursor-pointer hover:bg-[#2a2d3e] text-xs transition-colors ${
                                                selectedModId === mod.id
                                                    ? 'bg-[#094771] text-white hover:bg-[#094771]'
                                                    : !mod.enabled
                                                        ? 'text-slate-500 italic'
                                                        : 'text-slate-200'
                                            }`}
                                        >
                                            <div className="text-center font-mono text-slate-500">{mod.priority}</div>
                                            <div className="flex items-center gap-2 pl-2 overflow-hidden">
                                                <input
                                                    type="checkbox"
                                                    checked={mod.enabled}
                                                    onChange={e => {
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
                                    ))
                                ) : (
                                    <div className="p-8 text-center text-slate-500 italic">No mods detected. Run a scan or start the bridge.</div>
                                )}
                            </div>

                            <div className="p-1 bg-[#333333] border-t border-black text-[10px] text-slate-400 text-center">
                                Showing: {displayedMods.length} {activeTab === 'quests' ? 'Quest Mods' : 'Active Mods'}
                            </div>
                        </div>

                        <div className="w-96 bg-[#1e1e1e] flex flex-col">
                            {selectedMod ? (
                                <>
                                    <div className="p-3 border-b border-black bg-[#2d2d2d] font-bold text-slate-200 truncate" title={selectedMod.name}>
                                        {selectedMod.name}
                                    </div>

                                    <div className="flex border-b border-black text-xs">
                                        <div className={`px-3 py-1.5 cursor-pointer border-t-2 ${
                                            activeTab === 'quests' && selectedMod.category === 'Quest'
                                                ? 'bg-[#1e1e1e] text-slate-200 border-forge-accent'
                                                : 'bg-[#252526] text-slate-500 border-transparent'
                                        }`}>
                                            {selectedMod.category === 'Quest' ? 'Story Board' : 'Conflicts'}
                                        </div>
                                        <div className="px-3 py-1.5 bg-[#252526] text-slate-500 border-t-2 border-transparent">Files</div>
                                        {selectedMod.category === 'Quest' && <div className="px-3 py-1.5 bg-[#1e1e1e] text-slate-200 border-t-2 border-purple-500">Locations</div>}
                                    </div>

                                    <div className="flex-1 overflow-y-auto p-4 space-y-6">
                                        {activeTab === 'quests' && selectedMod.questData ? (
                                            <>
                                                <div>
                                                    <h4 className="text-[10px] font-bold text-purple-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                                                        <BookOpen className="w-3 h-3" /> Narrative Flow
                                                    </h4>
                                                    <div className="space-y-3 relative pl-4 border-l border-slate-700 ml-1">
                                                        {selectedMod.questData.storyArc.map(stage => (
                                                            <div key={stage.id} className="relative">
                                                                <div className={`absolute -left-[21px] top-1 w-3 h-3 rounded-full border-2 border-[#1e1e1e] ${stage.completed ? 'bg-emerald-500' : 'bg-slate-600'}`}></div>
                                                                <div className="text-xs font-bold text-slate-300">Stage {stage.id}</div>
                                                                <div className="text-[11px] text-slate-400">{stage.log}</div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>

                                                <div>
                                                    <h4 className="text-[10px] font-bold text-blue-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                                                        <MapPin className="w-3 h-3" /> Spawn Locations
                                                    </h4>
                                                    <div className="space-y-3">
                                                        {selectedMod.questData.locations.map(loc => (
                                                            <div key={loc.refId} className="bg-[#121212] border border-slate-800 rounded p-3 text-xs space-y-1">
                                                                <div className="font-bold text-slate-200 flex items-center gap-2">
                                                                    <Layers className="w-3 h-3 text-blue-400" /> {loc.cell}
                                                                </div>
                                                                <div className="text-slate-400">Ref: {loc.refId}</div>
                                                                <div className="text-slate-500">{loc.coords}</div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            </>
                                        ) : (
                                            <div className="space-y-4 text-xs text-slate-300">
                                                <div>
                                                    <h4 className="text-[10px] font-bold text-amber-300 uppercase tracking-widest mb-2">Conflict Trace</h4>
                                                    <div className="space-y-2 bg-[#121212] border border-slate-800 rounded p-3">
                                                        <div className="text-slate-400">Overwrites: {selectedMod.conflicts.overwrites.map(getModName).join(', ') || 'None detected'}</div>
                                                        <div className="text-slate-400">Overwritten by: {selectedMod.conflicts.overwrittenBy.map(getModName).join(', ') || 'None detected'}</div>
                                                    </div>
                                                </div>

                                                <div>
                                                    <h4 className="text-[10px] font-bold text-green-300 uppercase tracking-widest mb-2">Files</h4>
                                                    <div className="bg-[#121212] border border-slate-800 rounded p-3 space-y-1">
                                                        {selectedMod.files.length > 0 ? (
                                                            selectedMod.files.map(file => (
                                                                <div key={file} className="flex items-center gap-2 text-slate-300 text-[11px]">
                                                                    <Database className="w-3 h-3 text-slate-500" />
                                                                    {file}
                                                                </div>
                                                            ))
                                                        ) : (
                                                            <div className="text-slate-600 italic">No files mapped for this entry.</div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {analysisResult && (
                                        <div className="p-2 bg-slate-800 border-t border-black text-xs text-green-400 flex items-center gap-2">
                                            <Check className="w-3 h-3" />
                                            {analysisResult}
                                        </div>
                                    )}
                                </>
                            ) : (
                                <div className="flex-1 flex flex-col items-center justify-center text-slate-600 p-6 text-center">
                                    <Layers className="w-12 h-12 mb-4 opacity-20" />
                                    <p className="text-sm">Select a mod to view details.</p>
                                </div>
                            )}
                        </div>
                    </>
                ) : (
                    <div className="flex-1 bg-[#1b1b1b] p-8 overflow-y-auto">
                        <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-3">
                            <Wrench className="w-6 h-6 text-forge-accent" /> Tool Dashboard
                        </h2>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {utilities.map(tool => (
                                <div
                                    key={tool.id}
                                    className={`p-6 rounded-xl border-2 transition-all group ${
                                        tool.isInstalled ? 'bg-slate-800 border-slate-700' : 'bg-slate-900 border-dashed border-slate-700 opacity-80'
                                    }`}
                                >
                                    <div className="flex justify-between items-start mb-4">
                                        <div
                                            className={`p-3 rounded-lg ${
                                                tool.isInstalled ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/10 text-red-400'
                                            }`}
                                        >
                                            {tool.id === 'f4se' ? (
                                                <Zap className="w-6 h-6" />
                                            ) : tool.id === 'ck' ? (
                                                <Box className="w-6 h-6" />
                                            ) : tool.id === 'xedit' ? (
                                                <Database className="w-6 h-6" />
                                            ) : (
                                                <Settings className="w-6 h-6" />
                                            )}
                                        </div>
                                        {tool.isInstalled ? (
                                            <div className="px-2 py-1 rounded bg-emerald-900/30 text-emerald-400 text-xs font-bold flex items-center gap-1 border border-emerald-500/30">
                                                <Check className="w-3 h-3" /> Detected
                                            </div>
                                        ) : (
                                            tool.isRequired && (
                                                <div className="px-2 py-1 rounded bg-yellow-900/30 text-yellow-400 text-xs font-bold border border-yellow-500/30">
                                                    Required
                                                </div>
                                            )
                                        )}
                                    </div>

                                    <h3 className="text-lg font-bold text-white mb-1">{tool.name}</h3>
                                    <p className="text-sm text-slate-400 mb-4 h-10">{tool.description}</p>

                                    {tool.isInstalled ? (
                                        <div className="space-y-3">
                                            <div className="text-[10px] font-mono text-slate-500 break-all bg-black/30 p-2 rounded border border-slate-700">
                                                Path: {tool.path}
                                            </div>
                                            <button
                                                onClick={() => handleLaunchUtility(tool.path, tool.name)}
                                                className="w-full py-2 flex items-center justify-center gap-2 bg-emerald-700/40 hover:bg-emerald-600/60 text-emerald-400 rounded text-xs font-bold border border-emerald-500/30 transition-all"
                                            >
                                                <Play className="w-3 h-3" /> Launch Utility
                                            </button>
                                        </div>
                                    ) : (
                                        <button className="w-full py-2 flex items-center justify-center gap-2 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded text-xs font-bold transition-colors">
                                            <Download className="w-3 h-3" /> Find Tool
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
