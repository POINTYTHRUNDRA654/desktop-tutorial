import React, { useState, useEffect } from 'react';
import { Dna, Plus, Code, CheckCircle2, Copy, Trash2, Download, Upload, Share2, Users, BookOpen, Github, Zap, Search } from 'lucide-react';

interface CodeSnippet {
    id: string;
    title: string;
    description: string;
    language: 'papyrus' | 'xedit' | 'python';
    code: string;
    tags: string[];
    created: number;
}

interface CustomFunction {
    id: string;
    name: string;
    description: string;
    language: 'papyrus' | 'xedit' | 'python';
    code: string;
    parameters: string;
    returns: string;
    category: 'quest' | 'settlement' | 'mesh' | 'npc' | 'utility';
}

interface ModTemplate {
    id: string;
    name: string;
    description: string;
    type: 'quest' | 'settlement' | 'dungeon' | 'character' | 'location' | 'overhaul';
    files: { name: string; content: string }[];
}

const CODE_SNIPPETS: CodeSnippet[] = [
    {
        id: '1',
        title: 'Get Nearest Settlement',
        description: 'Find the closest settlement to current player location',
        language: 'papyrus',
        code: `Quest Function GetNearestSettlement() Global
    Quest[] settlements = new Quest[10]
    settlements = Game.GetLoadedSettlements()
    Float shortestDist = 999999.0
    Quest closest = None
    Int i = 0
    While i < settlements.Length
        Float dist = Game.GetPlayer().GetDistance(settlements[i])
        If dist < shortestDist
            shortestDist = dist
            closest = settlements[i]
        EndIf
        i += 1
    EndWhile
    Return closest
EndFunction`,
        tags: ['settlement', 'distance', 'utility'],
        created: Date.now()
    },
    {
        id: '2',
        title: 'Setup Quest Stages',
        description: 'Initialize quest with proper stage conditions and objectives',
        language: 'xedit',
        code: `procedure Initialize;
var
  i: integer;
begin
  for i := 0 to stages.Count - 1 do
  begin
    stages[i].Index := i;
    if Assigned(stages[i].Conditions) then
      stages[i].Conditions.SortByPriority();
  end;
end;`,
        tags: ['quest', 'stages', 'xedit'],
        created: Date.now()
    },
    {
        id: '3',
        title: 'Import NIF in Blender',
        description: 'Set up Blender scene for Bethesda NIF import with proper settings',
        language: 'python',
        code: `import bpy
import os

def setup_nif_import(filepath):
    # Clear default cube
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.object.delete(use_global=False)
    
    # Import NIF
    bpy.ops.import_scene.nif(filepath=filepath)
    
    # Set shading mode
    for area in bpy.context.screen.areas:
        if area.type == 'VIEW_3D':
            for space in area.spaces:
                if space.type == 'VIEW_3D':
                    space.shading.type = 'MATERIAL'
    
    return True`,
        tags: ['blender', 'nif', 'import'],
        created: Date.now()
    }
];

const CUSTOM_FUNCTIONS: CustomFunction[] = [
    {
        id: '1',
        name: 'RegisterCustomMenu',
        description: 'Register a custom dialogue menu with condition checks',
        language: 'papyrus',
        category: 'npc',
        code: `Function RegisterCustomMenu(String menuName, String[] options) Global
    ; Registers menu options with proper conditions
    If menuName == ""
        Return
    EndIf
    ; Implementation
EndFunction`,
        parameters: 'String menuName, String[] options',
        returns: 'None'
    },
    {
        id: '2',
        name: 'CalculateResourceBalance',
        description: 'Calculate net resources for a settlement (food, water, power)',
        language: 'papyrus',
        category: 'settlement',
        code: `Float Function CalculateResourceBalance(WorkshopScript settlement) Global
    Float food = settlement.resources[0]
    Float water = settlement.resources[1]
    Float power = settlement.resources[2]
    Return (food + water + power) / 3.0
EndFunction`,
        parameters: 'WorkshopScript settlement',
        returns: 'Float balance'
    },
    {
        id: '3',
        name: 'CopyMeshVertexGroups',
        description: 'Copy vertex groups from source to target mesh in Blender',
        language: 'python',
        category: 'mesh',
        code: `def copy_vertex_groups(source_obj, target_obj):
    for group in source_obj.vertex_groups:
        new_group = target_obj.vertex_groups.new(name=group.name)
        for member in group.group_members:
            new_group.add([member.index], 1.0, 'REPLACE')`,
        parameters: 'source_obj, target_obj',
        returns: 'None'
    }
];

const MOD_TEMPLATES: ModTemplate[] = [
    {
        id: '1',
        name: 'Simple Quest Mod',
        description: 'Complete quest mod with stages, rewards, and objectives',
        type: 'quest',
        files: [
            {
                name: 'QuestScript.psc',
                content: `ScriptName QuestScript extends Quest

Event OnInit()
    RegisterForSingleUpdate(1.0)
EndEvent

Event OnUpdate()
    ; Add quest logic here
EndEvent

Function CompleteQuest()
    ; Quest completion handler
EndFunction`
            },
            {
                name: 'DialogueScript.psc',
                content: `ScriptName DialogueScript extends TopicInfo

Function SetupDialogue()
    ; Initialize dialogue conditions
EndFunction`
            }
        ]
    },
    {
        id: '2',
        name: 'Settlement Expansion Pack',
        description: 'Add new settlement zones, buildings, and resources',
        type: 'settlement',
        files: [
            {
                name: 'SettlementSetup.psc',
                content: `ScriptName SettlementSetup extends Quest

Event OnInit()
    ; Initialize settlement modifications
    InitializeNewZones()
    InitializeNewBuildings()
EndEvent

Function InitializeNewZones()
    ; Add custom settlement zones
EndFunction

Function InitializeNewBuildings()
    ; Register new building objects
EndFunction`
            }
        ]
    },
    {
        id: '3',
        name: 'NPC Companion Mod',
        description: 'Create a custom companion with dialogue, perks, and interactions',
        type: 'character',
        files: [
            {
                name: 'CompanionScript.psc',
                content: `ScriptName CompanionScript extends ReferenceAlias

Event OnInit()
    RegisterForCustomEvents()
    SetupCompanion()
EndEvent

Function SetupCompanion()
    ; Configure companion stats, appearance, and perks
EndFunction

Function RegisterForCustomEvents()
    ; Register dialogue and interaction events
EndFunction`
            }
        ]
    }
];

const TheGenome: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'snippets' | 'functions' | 'templates'>('snippets');
    const [snippets, setSnippets] = useState<CodeSnippet[]>(CODE_SNIPPETS);
    const [customFunctions, setCustomFunctions] = useState<CustomFunction[]>(CUSTOM_FUNCTIONS);
    const [templates, setTemplates] = useState<ModTemplate[]>(MOD_TEMPLATES);
    
    const [searchTerm, setSearchTerm] = useState('');
    const [filterLanguage, setFilterLanguage] = useState<'all' | 'papyrus' | 'xedit' | 'python'>('all');
    const [copiedId, setCopiedId] = useState<string | null>(null);

    // Load from localStorage
    useEffect(() => {
        const saved = localStorage.getItem('genome_snippets');
        if (saved) setSnippets(JSON.parse(saved));
    }, []);

    useEffect(() => {
        localStorage.setItem('genome_snippets', JSON.stringify(snippets));
    }, [snippets]);

    const copyToClipboard = (code: string, id: string) => {
        navigator.clipboard.writeText(code);
        setCopiedId(id);
        setTimeout(() => setCopiedId(null), 2000);
    };

    const deleteSnippet = (id: string) => {
        setSnippets(prev => prev.filter(s => s.id !== id));
    };

    const filteredSnippets = snippets.filter(s =>
        (filterLanguage === 'all' || s.language === filterLanguage) &&
        (s.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
         s.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
         s.tags.some(t => t.toLowerCase().includes(searchTerm.toLowerCase())))
    );

    const filteredFunctions = customFunctions.filter(f =>
        (filterLanguage === 'all' || f.language === filterLanguage) &&
        (f.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
         f.description.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    const filteredTemplates = templates.filter(t =>
        t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.description.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="h-full flex flex-col bg-[#050505] text-slate-200 font-sans relative overflow-hidden">
            {/* Background */}
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-900/10 via-black to-black pointer-events-none"></div>

            {/* Header */}
            <div className="relative z-10 p-6 border-b border-slate-800 bg-slate-900/50 backdrop-blur">
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h1 className="text-2xl font-bold text-white flex items-center gap-3">
                            <Dna className="w-6 h-6 text-emerald-400 animate-pulse" />
                            The Genome
                        </h1>
                        <p className="text-xs text-slate-400 font-mono mt-1">Code Snippets • Functions • Mod Templates</p>
                    </div>
                </div>

                {/* Tab Navigation */}
                <div className="flex gap-2 border-b border-slate-800">
                    {[
                        { id: 'snippets', label: 'Code Snippets' },
                        { id: 'functions', label: 'Custom Functions' },
                        { id: 'templates', label: 'Mod Templates' }
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as any)}
                            className={`px-4 py-3 text-sm font-bold uppercase tracking-wider border-b-2 transition-colors whitespace-nowrap ${
                                activeTab === tab.id
                                    ? 'border-emerald-400 text-emerald-300'
                                    : 'border-transparent text-slate-500 hover:text-slate-300'
                            }`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Search Bar */}
            <div className="relative z-10 p-4 bg-slate-900/30 border-b border-slate-800 flex gap-4">
                <div className="flex-1 relative">
                    <Search className="absolute left-3 top-3 w-4 h-4 text-slate-500" />
                    <input
                        type="text"
                        placeholder="Search..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-slate-800 border border-slate-700 rounded p-2 pl-10 text-white text-sm focus:outline-none focus:border-emerald-500"
                    />
                </div>
                {(activeTab !== 'templates') && (
                    <select
                        value={filterLanguage}
                        onChange={(e) => setFilterLanguage(e.target.value as any)}
                        className="bg-slate-800 border border-slate-700 rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-emerald-500"
                    >
                        <option value="all">All Languages</option>
                        <option value="papyrus">Papyrus</option>
                        <option value="xedit">xEdit</option>
                        <option value="python">Python</option>
                    </select>
                )}
            </div>

            {/* Content */}
            <div className="flex-1 overflow-auto relative z-10">
                {activeTab === 'snippets' && (
                    <div className="p-8 max-w-6xl mx-auto">
                        <div className="grid gap-6">
                            {filteredSnippets.length === 0 ? (
                                <div className="text-center py-12 text-slate-500">
                                    <Code className="w-12 h-12 mx-auto mb-2 opacity-30" />
                                    <p>No snippets found</p>
                                </div>
                            ) : (
                                filteredSnippets.map(snippet => (
                                    <div key={snippet.id} className="bg-slate-800/40 border border-slate-700 rounded-lg p-6">
                                        <div className="flex justify-between items-start mb-4">
                                            <div>
                                                <h3 className="font-bold text-white text-lg">{snippet.title}</h3>
                                                <p className="text-sm text-slate-400 mt-1">{snippet.description}</p>
                                            </div>
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => copyToClipboard(snippet.code, snippet.id)}
                                                    className={`p-2 rounded transition-colors ${
                                                        copiedId === snippet.id
                                                            ? 'bg-emerald-600 text-white'
                                                            : 'bg-slate-700 text-slate-400 hover:text-white'
                                                    }`}
                                                    title="Copy to clipboard"
                                                >
                                                    {copiedId === snippet.id ? <CheckCircle2 className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                                                </button>
                                                <button
                                                    onClick={() => deleteSnippet(snippet.id)}
                                                    className="p-2 bg-slate-700 text-slate-400 hover:text-red-400 rounded transition-colors"
                                                    title="Delete snippet"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>

                                        <div className="mb-4 flex gap-2 items-center">
                                            <span className="bg-emerald-900/40 text-emerald-300 text-[10px] px-2 py-1 rounded font-mono">
                                                {snippet.language.toUpperCase()}
                                            </span>
                                            {snippet.tags.map(tag => (
                                                <span key={tag} className="bg-slate-700 text-slate-300 text-[10px] px-2 py-1 rounded">
                                                    {tag}
                                                </span>
                                            ))}
                                        </div>

                                        <div className="bg-black/50 rounded p-4 overflow-x-auto">
                                            <pre className="font-mono text-sm text-slate-300 whitespace-pre-wrap break-words">
                                                {snippet.code}
                                            </pre>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                )}

                {activeTab === 'functions' && (
                    <div className="p-8 max-w-6xl mx-auto">
                        <div className="grid gap-6">
                            {filteredFunctions.length === 0 ? (
                                <div className="text-center py-12 text-slate-500">
                                    <Zap className="w-12 h-12 mx-auto mb-2 opacity-30" />
                                    <p>No functions found</p>
                                </div>
                            ) : (
                                filteredFunctions.map(func => (
                                    <div key={func.id} className="bg-slate-800/40 border border-slate-700 rounded-lg p-6">
                                        <div className="flex justify-between items-start mb-4">
                                            <div>
                                                <h3 className="font-bold text-white text-lg font-mono">{func.name}</h3>
                                                <p className="text-sm text-slate-400 mt-1">{func.description}</p>
                                            </div>
                                            <button
                                                onClick={() => copyToClipboard(func.code, func.id)}
                                                className={`p-2 rounded transition-colors ${
                                                    copiedId === func.id
                                                        ? 'bg-emerald-600 text-white'
                                                        : 'bg-slate-700 text-slate-400 hover:text-white'
                                                }`}
                                            >
                                                {copiedId === func.id ? <CheckCircle2 className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                                            </button>
                                        </div>

                                        <div className="mb-4 flex gap-2">
                                            <span className="bg-emerald-900/40 text-emerald-300 text-[10px] px-2 py-1 rounded font-mono">
                                                {func.language.toUpperCase()}
                                            </span>
                                            <span className="bg-blue-900/40 text-blue-300 text-[10px] px-2 py-1 rounded">
                                                {func.category}
                                            </span>
                                        </div>

                                        <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
                                            <div>
                                                <span className="text-slate-500">Parameters:</span>
                                                <p className="font-mono text-slate-300">{func.parameters}</p>
                                            </div>
                                            <div>
                                                <span className="text-slate-500">Returns:</span>
                                                <p className="font-mono text-slate-300">{func.returns}</p>
                                            </div>
                                        </div>

                                        <div className="bg-black/50 rounded p-4 overflow-x-auto">
                                            <pre className="font-mono text-sm text-slate-300 whitespace-pre-wrap break-words">
                                                {func.code}
                                            </pre>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                )}

                {activeTab === 'templates' && (
                    <div className="p-8 max-w-4xl mx-auto">
                        <div className="grid gap-6">
                            {filteredTemplates.length === 0 ? (
                                <div className="text-center py-12 text-slate-500">
                                    <BookOpen className="w-12 h-12 mx-auto mb-2 opacity-30" />
                                    <p>No templates found</p>
                                </div>
                            ) : (
                                filteredTemplates.map(template => (
                                    <div key={template.id} className="bg-slate-800/40 border border-slate-700 rounded-lg p-6">
                                        <div className="flex justify-between items-start mb-4">
                                            <div>
                                                <h3 className="font-bold text-white text-lg">{template.name}</h3>
                                                <p className="text-sm text-slate-400 mt-1">{template.description}</p>
                                            </div>
                                            <button
                                                className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded font-bold text-sm transition-colors"
                                                title="Download template"
                                            >
                                                <Download className="w-4 h-4" /> Download
                                            </button>
                                        </div>

                                        <div className="mb-4">
                                            <span className="bg-purple-900/40 text-purple-300 text-[10px] px-2 py-1 rounded font-mono">
                                                {template.type.toUpperCase()}
                                            </span>
                                        </div>

                                        <div className="bg-black/50 rounded p-4 space-y-3">
                                            <div className="text-slate-400 text-sm font-bold">Files:</div>
                                            {template.files.map((file, i) => (
                                                <div key={i} className="border border-slate-700 rounded p-3">
                                                    <div className="flex justify-between items-center mb-2">
                                                        <span className="font-mono text-emerald-300 text-sm">{file.name}</span>
                                                        <button
                                                            onClick={() => copyToClipboard(file.content, `${template.id}-${i}`)}
                                                            className={`p-1 rounded transition-colors ${
                                                                copiedId === `${template.id}-${i}`
                                                                    ? 'bg-emerald-600 text-white'
                                                                    : 'bg-slate-700 text-slate-400 hover:text-white'
                                                            }`}
                                                        >
                                                            {copiedId === `${template.id}-${i}` ? <CheckCircle2 className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                                                        </button>
                                                    </div>
                                                    <pre className="font-mono text-[11px] text-slate-400 overflow-x-auto max-h-40">
                                                        {file.content}
                                                    </pre>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default TheGenome;