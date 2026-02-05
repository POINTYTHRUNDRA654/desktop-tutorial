import React, { useState, useEffect } from 'react';
import { FileDigit, AlertTriangle, Network, Plus, Trash2, ArrowRight, Database, Settings, Copy, Check } from 'lucide-react';

// ============================================================================
// LOAD ORDER MANAGER
// ============================================================================

interface Plugin {
    id: string;
    name: string;
    index: string;
    type: 'esm' | 'esp' | 'esl';
    author: string;
    dependencies: string[];
    conflicts: string[];
}

// ============================================================================
// FORM ID DATABASE
// ============================================================================

interface FormIDRecord {
    id: string;
    formId: string;
    editorId: string;
    recordType: string;
    owningPlugin: string;
    isConflict: boolean;
    conflicts: string[];
}

// ============================================================================
// PLUGIN DEPENDENCY GRAPH
// ============================================================================

interface DependencyNode {
    pluginName: string;
    author: string;
    conflicts: string[];
    dependsOn: string[];
}

// ============================================================================
// SAMPLE DATA
// ============================================================================

const SAMPLE_PLUGINS: Plugin[] = [
    { id: '0', name: 'Fallout4.esm', index: '00', type: 'esm', author: 'Bethesda', dependencies: [], conflicts: [] },
    { id: '1', name: 'DLCRobot.esm', index: 'FE:000', type: 'esm', author: 'Bethesda', dependencies: ['Fallout4.esm'], conflicts: [] },
    { id: '2', name: 'Unofficial Fallout 4 Patch.esp', index: '01', type: 'esp', author: 'Arthmoor', dependencies: ['Fallout4.esm'], conflicts: [] },
    { id: '3', name: 'ArmorKeywords.esm', index: 'FE:001', type: 'esm', author: 'Valdacil', dependencies: ['Fallout4.esm'], conflicts: [] },
    { id: '4', name: 'BetterWeapons.esp', index: '02', type: 'esp', author: 'Creative Clam', dependencies: ['Fallout4.esm', 'ArmorKeywords.esm'], conflicts: ['WeaponExpansion.esp'] },
    { id: '5', name: 'ClassicNPCs.esp', index: '03', type: 'esp', author: 'naugrim04', dependencies: ['Fallout4.esm', 'Unofficial Fallout 4 Patch.esp'], conflicts: [] },
];

const SAMPLE_FORMIDS: FormIDRecord[] = [
    { id: 'f1', formId: '00024E5E', editorId: 'Minigun', recordType: 'WEAP', owningPlugin: 'Fallout4.esm', isConflict: false, conflicts: [] },
    { id: 'f2', formId: '0004B234', editorId: 'CombatRifle', recordType: 'WEAP', owningPlugin: 'Fallout4.esm', isConflict: true, conflicts: ['BetterWeapons.esp'] },
    { id: 'f3', formId: '00129A88', editorId: 'PowerArmorT60', recordType: 'ARMO', owningPlugin: 'Fallout4.esm', isConflict: true, conflicts: ['BetterWeapons.esp'] },
    { id: 'f4', formId: '000D83BF', editorId: 'Stimpack', recordType: 'ALCH', owningPlugin: 'Fallout4.esm', isConflict: false, conflicts: [] },
    { id: 'f5', formId: '02000800', editorId: 'CombatRifleMkII', recordType: 'WEAP', owningPlugin: 'BetterWeapons.esp', isConflict: true, conflicts: ['ClassicNPCs.esp'] },
    { id: 'f6', formId: '02000801', editorId: 'PlasmaRifleMkIII', recordType: 'WEAP', owningPlugin: 'BetterWeapons.esp', isConflict: false, conflicts: [] },
];

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const TheRegistry: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'loadorder' | 'formids' | 'dependency'>('loadorder');
    const [plugins, setPlugins] = useState<Plugin[]>(SAMPLE_PLUGINS);
    const [formids, setFormids] = useState<FormIDRecord[]>(SAMPLE_FORMIDS);
    const [selectedFormID, setSelectedFormID] = useState<FormIDRecord | null>(null);
    const [copiedFormID, setCopiedFormID] = useState<string | null>(null);

    // Calculate conflict count
    const conflictCount = plugins.reduce((sum, p) => sum + p.conflicts.length, 0);
    const formidConflictCount = formids.filter(f => f.isConflict).length;

    // Handle copy to clipboard
    const handleCopyFormID = (formId: string) => {
        navigator.clipboard.writeText(formId);
        setCopiedFormID(formId);
        setTimeout(() => setCopiedFormID(null), 2000);
    };

    // Build dependency graph data
    const buildDependencyGraph = (): DependencyNode[] => {
        return plugins.map(p => ({
            pluginName: p.name,
            author: p.author,
            conflicts: p.conflicts,
            dependsOn: p.dependencies,
        }));
    };

    return (
        <div className="h-full flex flex-col bg-[#1e1e1e] text-slate-200 font-sans text-sm">
            {/* Header */}
            <div className="p-4 border-b border-black bg-[#2d2d2d] flex justify-between items-center shadow-md">
                <div>
                    <h2 className="text-lg font-bold text-white flex items-center gap-2">
                        <FileDigit className="w-5 h-5 text-orange-400" />
                        The Registry
                    </h2>
                    <p className="text-[10px] text-slate-400 font-mono mt-0.5">Mod Management Nexus v3.2.0</p>
                </div>
                <div className="flex gap-2">
                    <div className="px-3 py-1 bg-black rounded border border-slate-600 font-mono text-xs text-green-400">
                        Plugins: {plugins.length}
                    </div>
                    <div className="px-3 py-1 bg-black rounded border border-slate-600 font-mono text-xs text-red-400">
                        Conflicts: {conflictCount + formidConflictCount}
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-black bg-[#252526]">
                <button
                    onClick={() => setActiveTab('loadorder')}
                    className={`px-4 py-2 text-xs font-semibold border-b-2 transition-colors ${
                        activeTab === 'loadorder' 
                            ? 'border-orange-400 text-orange-300' 
                            : 'border-transparent text-slate-400 hover:text-slate-300'
                    }`}
                >
                    Load Order Manager
                </button>
                <button
                    onClick={() => setActiveTab('formids')}
                    className={`px-4 py-2 text-xs font-semibold border-b-2 transition-colors ${
                        activeTab === 'formids' 
                            ? 'border-orange-400 text-orange-300' 
                            : 'border-transparent text-slate-400 hover:text-slate-300'
                    }`}
                >
                    Form ID Database
                </button>
                <button
                    onClick={() => setActiveTab('dependency')}
                    className={`px-4 py-2 text-xs font-semibold border-b-2 transition-colors ${
                        activeTab === 'dependency' 
                            ? 'border-orange-400 text-orange-300' 
                            : 'border-transparent text-slate-400 hover:text-slate-300'
                    }`}
                >
                    Dependency Graph
                </button>
            </div>

            <div className="flex-1 overflow-hidden">
                {/* LOAD ORDER MANAGER TAB */}
                {activeTab === 'loadorder' && (
                    <div className="h-full flex flex-col overflow-hidden">
                        <div className="flex-1 overflow-y-auto">
                            <div className="p-4 space-y-2">
                                {plugins.map((plugin, idx) => (
                                    <div 
                                        key={plugin.id} 
                                        className="bg-[#252526] border border-slate-700 rounded p-3 hover:border-slate-600 transition-colors"
                                    >
                                        <div className="flex items-start justify-between mb-2">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 bg-[#1e1e1e] border border-slate-600 rounded flex items-center justify-center font-mono text-xs text-slate-400">
                                                    {plugin.index}
                                                </div>
                                                <div>
                                                    <div className={`font-semibold ${plugin.type === 'esm' ? 'text-blue-300' : 'text-slate-200'}`}>
                                                        {plugin.name}
                                                    </div>
                                                    <div className="text-[10px] text-slate-500">{plugin.author}</div>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className={`px-2 py-1 rounded text-[10px] font-mono ${
                                                    plugin.type === 'esm' ? 'bg-blue-900/30 text-blue-300' : 
                                                    plugin.type === 'esl' ? 'bg-purple-900/30 text-purple-300' : 
                                                    'bg-slate-800 text-slate-300'
                                                }`}>
                                                    {plugin.type}
                                                </span>
                                            </div>
                                        </div>
                                        {plugin.dependencies.length > 0 && (
                                            <div className="mb-2 pl-11">
                                                <div className="text-[10px] text-slate-500 mb-1">Requires:</div>
                                                <div className="flex flex-wrap gap-1">
                                                    {plugin.dependencies.map((dep, i) => (
                                                        <span key={i} className="px-2 py-0.5 bg-blue-900/20 text-blue-300 rounded text-[10px]">
                                                            {dep}
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                        {plugin.conflicts.length > 0 && (
                                            <div className="pl-11">
                                                <div className="text-[10px] text-red-400 mb-1 flex items-center gap-1">
                                                    <AlertTriangle className="w-3 h-3" /> Conflicts:
                                                </div>
                                                <div className="flex flex-wrap gap-1">
                                                    {plugin.conflicts.map((conflict, i) => (
                                                        <span key={i} className="px-2 py-0.5 bg-red-900/20 text-red-300 rounded text-[10px]">
                                                            {conflict}
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {/* FORM ID DATABASE TAB */}
                {activeTab === 'formids' && (
                    <div className="h-full flex flex-col overflow-hidden">
                        <div className="flex-1 overflow-y-auto">
                            <div className="p-4 space-y-2">
                                {formids.map((formid) => (
                                    <div 
                                        key={formid.id}
                                        onClick={() => setSelectedFormID(formid)}
                                        className={`bg-[#252526] border rounded p-3 cursor-pointer transition-all ${
                                            selectedFormID?.id === formid.id 
                                                ? 'border-orange-500 shadow-lg shadow-orange-900/30' 
                                                : 'border-slate-700 hover:border-slate-600'
                                        } ${formid.isConflict ? 'bg-red-900/10' : ''}`}
                                    >
                                        <div className="flex items-start justify-between mb-2">
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <div className="font-mono text-orange-300 font-semibold">
                                                        {formid.formId}
                                                    </div>
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleCopyFormID(formid.formId);
                                                        }}
                                                        className="p-1 hover:bg-slate-700 rounded transition-colors"
                                                    >
                                                        {copiedFormID === formid.formId ? (
                                                            <Check className="w-3 h-3 text-green-400" />
                                                        ) : (
                                                            <Copy className="w-3 h-3 text-slate-400" />
                                                        )}
                                                    </button>
                                                </div>
                                                <div className="text-slate-300 font-semibold">{formid.editorId}</div>
                                                <div className="text-[10px] text-slate-500">{formid.recordType} • {formid.owningPlugin}</div>
                                            </div>
                                            {formid.isConflict && (
                                                <div className="px-2 py-1 bg-red-900/40 text-red-300 rounded text-[10px] font-semibold flex items-center gap-1">
                                                    <AlertTriangle className="w-3 h-3" />
                                                    Conflict
                                                </div>
                                            )}
                                        </div>
                                        {formid.conflicts.length > 0 && (
                                            <div className="flex flex-wrap gap-1">
                                                {formid.conflicts.map((conflict, i) => (
                                                    <span key={i} className="px-2 py-0.5 bg-red-900/30 text-red-300 rounded text-[10px]">
                                                        {conflict}
                                                    </span>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {/* DEPENDENCY GRAPH TAB */}
                {activeTab === 'dependency' && (
                    <div className="h-full flex flex-col overflow-hidden">
                        <div className="flex-1 overflow-y-auto">
                            <div className="p-4 space-y-3">
                                {buildDependencyGraph().map((node, idx) => (
                                    <div key={idx} className="bg-[#252526] border border-slate-700 rounded p-4">
                                        <div className="flex items-center gap-2 mb-3">
                                            <Network className="w-4 h-4 text-orange-400" />
                                            <div>
                                                <div className="font-semibold text-slate-200">{node.pluginName}</div>
                                                <div className="text-[10px] text-slate-500">{node.author}</div>
                                            </div>
                                        </div>

                                        {node.dependsOn.length > 0 && (
                                            <div className="mb-3 pl-6">
                                                <div className="text-[10px] text-slate-400 mb-2 font-semibold">DEPENDS ON:</div>
                                                <div className="space-y-1">
                                                    {node.dependsOn.map((dep, i) => (
                                                        <div key={i} className="flex items-center gap-2 text-[10px]">
                                                            <ArrowRight className="w-3 h-3 text-blue-400" />
                                                            <span className="text-blue-300 bg-blue-900/20 px-2 py-0.5 rounded">
                                                                {dep}
                                                            </span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {node.conflicts.length > 0 && (
                                            <div className="pl-6">
                                                <div className="text-[10px] text-red-400 mb-2 font-semibold flex items-center gap-1">
                                                    <AlertTriangle className="w-3 h-3" /> CONFLICTS:
                                                </div>
                                                <div className="space-y-1">
                                                    {node.conflicts.map((conflict, i) => (
                                                        <div key={i} className="flex items-center gap-2 text-[10px]">
                                                            <ArrowRight className="w-3 h-3 text-red-400" />
                                                            <span className="text-red-300 bg-red-900/20 px-2 py-0.5 rounded">
                                                                {conflict}
                                                            </span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default TheRegistry;