import React, { useState } from 'react';
import { DraftingCompass, Briefcase, CheckCircle2, Copy, ChevronRight, AlertCircle, FileText, Plus, Trash2 } from 'lucide-react';

// ============================================================================
// MOD ARCHITECTURE PLANNER - Blueprint for Fallout 4 Mods
// ============================================================================

interface ModTemplate {
    id: string;
    name: string;
    description: string;
    structure: FileStructure[];
    components: ModComponent[];
    dependencies: string[];
}

interface FileStructure {
    path: string;
    type: 'folder' | 'file';
    description: string;
}

interface ModComponent {
    name: string;
    type: string;
    required: boolean;
    description: string;
}

// ============================================================================
// MOD RECIPE DATA - Real Fallout 4 Mod Structures
// ============================================================================

const MOD_TEMPLATES: ModTemplate[] = [
    {
        id: 'quest',
        name: 'Quest Mod',
        description: 'Multi-stage quest with dialogue, scripts, and stage index',
        structure: [
            { path: 'MyQuestMod.esp', type: 'file', description: 'Main plugin (Master data file)' },
            { path: 'Data/Scripts/Source/', type: 'folder', description: 'Papyrus quest scripts' },
            { path: 'Data/Seq Files/', type: 'folder', description: 'Compiled Papyrus bytecode' },
            { path: 'Data/Dialogue/', type: 'folder', description: 'Quest dialogue topics (optional)' },
            { path: 'Data/Meshes/Custom/', type: 'folder', description: 'Quest-specific geometry' },
            { path: 'Data/Textures/Custom/', type: 'folder', description: 'Quest-specific textures' },
        ],
        components: [
            { name: 'Quest Record', type: 'QUST', required: true, description: 'Main quest with stages and objectives' },
            { name: 'Aliases', type: 'ALID', required: true, description: 'References to NPCs/Items in quest' },
            { name: 'Stages', type: 'QOBJ', required: true, description: 'Quest progression points' },
            { name: 'Scripts', type: 'SCPT', required: false, description: 'Papyrus logic (fragments or full scripts)' },
            { name: 'Dialogue', type: 'DIAL', required: false, description: 'Quest-specific dialogue topics' },
            { name: 'Rewards', type: 'MISC/ARMO/WEAP', required: false, description: 'Items given on completion' },
        ],
        dependencies: ['Fallout4.esm'],
    },
    {
        id: 'settlement',
        name: 'Settlement Expansion',
        description: 'New settlement workbenches, plots, and build-able objects',
        structure: [
            { path: 'SettlementPack.esp', type: 'file', description: 'Main plugin' },
            { path: 'Data/Meshes/Settlement/', type: 'folder', description: 'Custom settlement objects' },
            { path: 'Data/Textures/Settlement/', type: 'folder', description: 'Textures for custom objects' },
            { path: 'Data/Materials/', type: 'folder', description: 'Material definitions (NIFs)' },
            { path: 'Data/Scripts/Source/', type: 'folder', description: 'Settlement logic scripts (optional)' },
        ],
        components: [
            { name: 'Workbench', type: 'FURN', required: true, description: 'Settlement workbench (Crafting/Decorating)' },
            { name: 'Workshop Markers', type: 'WTST', required: true, description: 'Workshop settlement markers' },
            { name: 'Build Plots', type: 'PLYM', required: false, description: 'Buildable plot objects' },
            { name: 'Furniture', type: 'FURN', required: false, description: 'Decorative/functional furniture' },
            { name: 'Activators', type: 'ACTI', required: false, description: 'Clickable objects (doors, gates, etc)' },
            { name: 'Navmesh', type: 'NAVM', required: false, description: 'NPC pathfinding mesh (required for NPCs)' },
        ],
        dependencies: ['Fallout4.esm', 'DLCWorkshop01.esm', 'DLCWorkshop02.esm', 'DLCWorkshop03.esm'],
    },
    {
        id: 'companion',
        name: 'NPC Companion',
        description: 'New follower with dialogue, perks, and AI packages',
        structure: [
            { path: 'CompanionMod.esp', type: 'file', description: 'Main plugin' },
            { path: 'Data/Meshes/Actors/Character/', type: 'folder', description: 'Custom facial geometry (FaceGen)' },
            { path: 'Data/Textures/Actors/Character/', type: 'folder', description: 'Character textures and head parts' },
            { path: 'Data/Voice/', type: 'folder', description: 'Voice lines (optional, lip-synced)' },
            { path: 'Data/Scripts/Source/', type: 'folder', description: 'Companion AI and behavior scripts' },
        ],
        components: [
            { name: 'NPC Record', type: 'NPC_', required: true, description: 'Character data (race, stats, skills)' },
            { name: 'Dialogue', type: 'DIAL', required: true, description: 'Greetings and dialogue topics' },
            { name: 'AI Packages', type: 'PACK', required: true, description: 'Behavior routines and daily schedules' },
            { name: 'Factions', type: 'FACT', required: false, description: 'Faction membership' },
            { name: 'Perks', type: 'PERK', required: false, description: 'Companion-specific perks' },
            { name: 'Combat Style', type: 'CSTL', required: false, description: 'How companion fights' },
        ],
        dependencies: ['Fallout4.esm'],
    },
    {
        id: 'weapons',
        name: 'Weapon/Armor Pack',
        description: 'New weapons or armor with meshes, textures, and balancing',
        structure: [
            { path: 'WeaponPack.esp', type: 'file', description: 'Main plugin' },
            { path: 'Data/Meshes/Weapons/', type: 'folder', description: 'Weapon geometry (NIF files)' },
            { path: 'Data/Meshes/Armor/', type: 'folder', description: 'Armor geometry' },
            { path: 'Data/Textures/Weapons/', type: 'folder', description: 'Diffuse, normal, smoothness maps' },
            { path: 'Data/Textures/Armor/', type: 'folder', description: 'Armor textures' },
            { path: 'Data/Scripts/Source/', type: 'folder', description: 'Enchantment/effect scripts (optional)' },
        ],
        components: [
            { name: 'Weapon Record', type: 'WEAP', required: true, description: 'Weapon stats, damage, perks' },
            { name: 'Armor Record', type: 'ARMO', required: true, description: 'Armor stats, DR, slots' },
            { name: 'Keywords', type: 'KYWD', required: true, description: 'Categorization (Rifle, Heavy, etc)' },
            { name: 'Models', type: 'Static', required: true, description: 'NIF mesh references' },
            { name: 'Textures', type: 'DDS', required: true, description: 'Diffuse + Normal + Spec maps' },
            { name: 'Crafting Recipe', type: 'COBJ', required: false, description: 'How to craft at workbench' },
        ],
        dependencies: ['Fallout4.esm', 'ArmorKeywords.esm'],
    },
    {
        id: 'worldexpansion',
        name: 'World Expansion',
        description: 'New cells, cells, creatures, encounters, and environmental storytelling',
        structure: [
            { path: 'WorldExpansion.esp', type: 'file', description: 'Main plugin' },
            { path: 'Data/Meshes/Cells/', type: 'folder', description: 'Cell-specific architecture and objects' },
            { path: 'Data/Textures/Cells/', type: 'folder', description: 'Cell textures' },
            { path: 'Data/Landscapes/', type: 'folder', description: 'Heightmaps and terrain (if expanding Tamriel)' },
            { path: 'Data/Scripts/Source/', type: 'folder', description: 'Encounter scripting' },
        ],
        components: [
            { name: 'Cell', type: 'CELL', required: true, description: 'Interior or exterior cell data' },
            { name: 'References', type: 'REFR', required: true, description: 'Objects, NPCs, traps placed in cell' },
            { name: 'Navmesh', type: 'NAVM', required: true, description: 'NPC pathfinding' },
            { name: 'Creatures', type: 'CREA', required: false, description: 'Custom encounter creatures' },
            { name: 'Traps', type: 'TRAP', required: false, description: 'Pressure plates, swinging blades, etc' },
            { name: 'Lighting', type: 'LIGH', required: false, description: 'Light sources and effects' },
        ],
        dependencies: ['Fallout4.esm'],
    },
];

const TheBlueprint: React.FC = () => {
    const [selectedTemplate, setSelectedTemplate] = useState<ModTemplate>(MOD_TEMPLATES[0]);
    const [expandedStructure, setExpandedStructure] = useState<string | null>(null);
    const [copiedPath, setCopiedPath] = useState<string | null>(null);

    const handleCopyStructure = async () => {
        const structureText = selectedTemplate.structure
            .map(item => `${item.type === 'folder' ? '📁' : '📄'} ${item.path} - ${item.description}`)
            .join('\n');
        
        navigator.clipboard.writeText(structureText);
        setCopiedPath('all');
        setTimeout(() => setCopiedPath(null), 2000);
    };

    const handleCopyPath = (path: string) => {
        navigator.clipboard.writeText(path);
        setCopiedPath(path);
        setTimeout(() => setCopiedPath(null), 2000);
    };

    return (
        <div className="h-full flex flex-col bg-[#1e1e1e] text-slate-200 font-sans overflow-hidden">
            {/* Header */}
            <div className="p-4 border-b border-black bg-[#2d2d2d] flex justify-between items-center shadow-md">
                <div>
                    <h2 className="text-lg font-bold text-white flex items-center gap-2">
                        <DraftingCompass className="w-5 h-5 text-amber-400" />
                        The Blueprint
                    </h2>
                    <p className="text-[10px] text-slate-400 font-mono mt-0.5">Mod Architecture Planner v2.1.0</p>
                </div>
                <div className="px-3 py-1 bg-black rounded border border-slate-600 font-mono text-xs text-amber-400">
                    {MOD_TEMPLATES.length} Templates
                </div>
            </div>

            <div className="flex-1 flex overflow-hidden">
                {/* Left: Template List */}
                <div className="w-64 bg-[#252526] border-r border-black flex flex-col">
                    <div className="p-2 bg-[#333333] border-b border-black text-[10px] font-bold text-slate-300 uppercase tracking-wider">
                        Mod Templates
                    </div>
                    <div className="flex-1 overflow-y-auto">
                        {MOD_TEMPLATES.map((template) => (
                            <div
                                key={template.id}
                                onClick={() => setSelectedTemplate(template)}
                                className={`p-3 border-b border-slate-800 cursor-pointer transition-colors ${
                                    selectedTemplate.id === template.id
                                        ? 'bg-amber-900/30 border-l-4 border-l-amber-400'
                                        : 'hover:bg-[#2d2d30]'
                                }`}
                            >
                                <div className="font-semibold text-slate-200 text-sm">{template.name}</div>
                                <div className="text-[10px] text-slate-500 mt-0.5">{template.description}</div>
                                <div className="flex gap-1 mt-2">
                                    <span className="px-1.5 py-0.5 bg-slate-800 text-[9px] text-slate-400 rounded">
                                        {template.components.length} components
                                    </span>
                                    <span className="px-1.5 py-0.5 bg-slate-800 text-[9px] text-slate-400 rounded">
                                        {template.structure.length} files
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Center/Right: Template Details */}
                <div className="flex-1 flex flex-col overflow-hidden">
                    {/* Template Tabs */}
                    <div className="flex border-b border-black bg-[#252526]">
                        <button
                            onClick={() => setExpandedStructure('structure')}
                            className={`px-4 py-2 text-xs font-semibold border-b-2 transition-colors ${
                                expandedStructure === 'structure'
                                    ? 'border-amber-400 text-amber-300'
                                    : 'border-transparent text-slate-400 hover:text-slate-300'
                            }`}
                        >
                            Folder Structure
                        </button>
                        <button
                            onClick={() => setExpandedStructure('components')}
                            className={`px-4 py-2 text-xs font-semibold border-b-2 transition-colors ${
                                expandedStructure === 'components'
                                    ? 'border-amber-400 text-amber-300'
                                    : 'border-transparent text-slate-400 hover:text-slate-300'
                            }`}
                        >
                            Required Components
                        </button>
                        <button
                            onClick={() => setExpandedStructure('dependencies')}
                            className={`px-4 py-2 text-xs font-semibold border-b-2 transition-colors ${
                                expandedStructure === 'dependencies'
                                    ? 'border-amber-400 text-amber-300'
                                    : 'border-transparent text-slate-400 hover:text-slate-300'
                            }`}
                        >
                            Dependencies
                        </button>
                    </div>

                    {/* Content Area */}
                    <div className="flex-1 overflow-y-auto p-4">
                        {/* FOLDER STRUCTURE TAB */}
                        {expandedStructure !== 'components' && expandedStructure !== 'dependencies' && (
                            <div className="space-y-2">
                                <div className="flex justify-between items-center mb-4">
                                    <h3 className="font-semibold text-slate-200">Folder & File Structure</h3>
                                    <button
                                        onClick={handleCopyStructure}
                                        className="p-1 hover:bg-slate-700 rounded transition-colors"
                                    >
                                        {copiedPath === 'all' ? (
                                            <CheckCircle2 className="w-4 h-4 text-green-400" />
                                        ) : (
                                            <Copy className="w-4 h-4 text-slate-400" />
                                        )}
                                    </button>
                                </div>
                                {selectedTemplate.structure.map((item, idx) => (
                                    <div key={idx} className="bg-[#252526] border border-slate-700 rounded p-3 hover:border-slate-600 transition-colors">
                                        <div className="flex items-start justify-between mb-1">
                                            <div className="flex items-center gap-2">
                                                <span className="text-amber-400 font-mono text-sm">
                                                    {item.type === 'folder' ? '📁' : '📄'}
                                                </span>
                                                <code className="text-slate-300 font-mono text-xs">{item.path}</code>
                                            </div>
                                            <button
                                                onClick={() => handleCopyPath(item.path)}
                                                className="p-1 hover:bg-slate-600 rounded transition-colors"
                                            >
                                                {copiedPath === item.path ? (
                                                    <CheckCircle2 className="w-3 h-3 text-green-400" />
                                                ) : (
                                                    <Copy className="w-3 h-3 text-slate-500" />
                                                )}
                                            </button>
                                        </div>
                                        <p className="text-[10px] text-slate-500 pl-6">{item.description}</p>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* COMPONENTS TAB */}
                        {expandedStructure === 'components' && (
                            <div className="space-y-3">
                                <h3 className="font-semibold text-slate-200 mb-4">Required & Optional Components</h3>
                                {selectedTemplate.components.map((comp, idx) => (
                                    <div key={idx} className={`bg-[#252526] border rounded p-3 ${comp.required ? 'border-red-700/50' : 'border-slate-700'}`}>
                                        <div className="flex items-start justify-between mb-2">
                                            <div>
                                                <div className="font-semibold text-slate-200 text-sm flex items-center gap-2">
                                                    {comp.name}
                                                    {comp.required && (
                                                        <span className="px-1.5 py-0.5 bg-red-900/40 text-red-300 text-[8px] font-bold rounded">
                                                            REQUIRED
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="text-[10px] text-slate-500 font-mono">{comp.type}</div>
                                            </div>
                                        </div>
                                        <p className="text-[10px] text-slate-400">{comp.description}</p>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* DEPENDENCIES TAB */}
                        {expandedStructure === 'dependencies' && (
                            <div className="space-y-3">
                                <h3 className="font-semibold text-slate-200 mb-4">Master Files & Dependencies</h3>
                                {selectedTemplate.dependencies.length > 0 ? (
                                    selectedTemplate.dependencies.map((dep, idx) => (
                                        <div key={idx} className="bg-[#252526] border border-blue-700/50 rounded p-3">
                                            <div className="flex items-center gap-2">
                                                <Briefcase className="w-4 h-4 text-blue-400" />
                                                <div>
                                                    <div className="font-semibold text-slate-200 text-sm">{dep}</div>
                                                    <div className="text-[10px] text-slate-500 mt-0.5">
                                                        {dep === 'Fallout4.esm' && 'Base game master file - required for all mods'}
                                                        {dep.includes('DLC') && `${dep} - DLC master file`}
                                                        {dep === 'ArmorKeywords.esm' && 'Armor metadata - shared keywords across armor mods'}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="text-slate-500 text-sm p-4 text-center">No external dependencies</div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TheBlueprint;