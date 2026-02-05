import { useState } from 'react';
import { Link2, Package, GitBranch, AlertCircle, CheckCircle2, Copy, Zap, ArrowDownToLine, Upload, RefreshCw } from 'lucide-react';

interface PluginIntegration {
    id: string;
    name: string;
    type: 'master' | 'plugin' | 'esp' | 'esl';
    status: 'loaded' | 'conflict' | 'missing' | 'disabled';
    formId: string;
    dependencies: string[];
    loadOrder: number;
    version: string;
}

interface SyncChannel {
    id: string;
    name: string;
    source: string;
    target: string;
    direction: 'bidirectional' | 'read-only' | 'write-only';
    lastSync: string;
    status: 'active' | 'paused' | 'error';
}

interface ToolIntegration {
    id: string;
    name: string;
    category: 'mesh' | 'texture' | 'script' | 'plugin' | 'utility';
    installed: boolean;
    version: string;
    purpose: string;
}

const SAMPLE_PLUGINS: PluginIntegration[] = [
    {
        id: 'fallout4',
        name: 'Fallout4.esm',
        type: 'master',
        status: 'loaded',
        formId: '00000000',
        dependencies: [],
        loadOrder: 0,
        version: '1.10.163'
    },
    {
        id: 'dloharb',
        name: 'DLCRobot.esm',
        type: 'master',
        status: 'loaded',
        formId: '04000800',
        dependencies: ['Fallout4.esm'],
        loadOrder: 1,
        version: '1.0'
    },
    {
        id: 'armormod',
        name: 'AdvancedArmor.esp',
        type: 'esp',
        status: 'loaded',
        formId: '01003D62',
        dependencies: ['Fallout4.esm', 'DLCRobot.esm'],
        loadOrder: 4,
        version: '2.1'
    },
    {
        id: 'weaponpack',
        name: 'WeaponExpansion.esp',
        type: 'esp',
        status: 'conflict',
        formId: '02001C44',
        dependencies: ['Fallout4.esm', 'AdvancedArmor.esp'],
        loadOrder: 5,
        version: '1.5'
    },
    {
        id: 'questmods',
        name: 'QuestFramework.esp',
        type: 'esp',
        status: 'loaded',
        formId: '03002891',
        dependencies: ['Fallout4.esm'],
        loadOrder: 6,
        version: '3.0'
    },
    {
        id: 'settlement',
        name: 'SettlementExpansion.esl',
        type: 'esl',
        status: 'loaded',
        formId: 'FE000001',
        dependencies: ['Fallout4.esm'],
        loadOrder: 7,
        version: '1.8'
    }
];

const SAMPLE_SYNC_CHANNELS: SyncChannel[] = [
    {
        id: 'xedit-sync',
        name: 'xEdit Plugin Sync',
        source: 'xEdit Forms Database',
        target: 'Load Order Manager',
        direction: 'bidirectional',
        lastSync: '5 minutes ago',
        status: 'active'
    },
    {
        id: 'nif-sync',
        name: 'Mesh Asset Sync',
        source: 'Asset Validator',
        target: 'Outfit Studio',
        direction: 'read-only',
        lastSync: '2 hours ago',
        status: 'active'
    },
    {
        id: 'script-sync',
        name: 'Script Compiler Sync',
        source: 'Papyrus Compiler',
        target: 'Data Files',
        direction: 'write-only',
        lastSync: '30 minutes ago',
        status: 'active'
    },
    {
        id: 'texture-sync',
        name: 'Texture Cache Sync',
        source: 'Texture Directory',
        target: 'Archive Invalidation',
        direction: 'bidirectional',
        lastSync: '1 day ago',
        status: 'paused'
    }
];

const SAMPLE_TOOLS: ToolIntegration[] = [
    {
        id: 'xedit',
        name: 'xEdit',
        category: 'plugin',
        installed: true,
        version: '4.0.4',
        purpose: 'Plugin editor and form ID database'
    },
    {
        id: 'outfit-studio',
        name: 'Outfit Studio',
        category: 'mesh',
        installed: true,
        version: '2.6.2',
        purpose: 'NIF mesh and armor modification'
    },
    {
        id: 'blender',
        name: 'Blender 3.x',
        category: 'mesh',
        installed: false,
        version: '3.6.2',
        purpose: '3D modeling and asset creation'
    },
    {
        id: 'papyrus',
        name: 'Papyrus Compiler',
        category: 'script',
        installed: true,
        version: '1.0.163',
        purpose: 'Fallout 4 script compilation'
    },
    {
        id: 'nifskope',
        name: 'Nifskope',
        category: 'mesh',
        installed: true,
        version: '2.0.7',
        purpose: 'NIF file inspection and editing'
    },
    {
        id: 'substance',
        name: 'Substance Painter',
        category: 'texture',
        installed: false,
        version: '2024.1',
        purpose: 'Professional texture and material painting'
    }
];

const getStatusColor = (status: string) => {
    switch (status) {
        case 'loaded':
        case 'active':
            return 'bg-green-900/20 border-green-700/50 text-green-300';
        case 'conflict':
        case 'error':
            return 'bg-red-900/20 border-red-700/50 text-red-300';
        case 'paused':
            return 'bg-yellow-900/20 border-yellow-700/50 text-yellow-300';
        case 'missing':
        case 'disabled':
            return 'bg-slate-900/20 border-slate-700/50 text-slate-300';
        default:
            return 'bg-blue-900/20 border-blue-700/50 text-blue-300';
    }
};

const TheConduit = () => {
    const [activeTab, setActiveTab] = useState<'plugins' | 'sync' | 'tools'>('plugins');
    const [copiedId, setCopiedId] = useState<string | null>(null);

    const handleCopyId = (id: string) => {
        navigator.clipboard.writeText(id);
        setCopiedId(id);
        setTimeout(() => setCopiedId(null), 2000);
    };

    const loadedPlugins = SAMPLE_PLUGINS.filter(p => p.status === 'loaded').length;
    const conflictPlugins = SAMPLE_PLUGINS.filter(p => p.status === 'conflict').length;
    const installedTools = SAMPLE_TOOLS.filter(t => t.installed).length;

    return (
        <div className="h-full flex flex-col bg-[#1e1e1e] text-slate-200 font-sans overflow-hidden">
            {/* Header */}
            <div className="p-4 border-b border-black bg-[#2d2d2d] flex justify-between items-center shadow-md">
                <div>
                    <h2 className="text-lg font-bold text-white flex items-center gap-2">
                        <Link2 className="w-5 h-5 text-blue-400" />
                        The Conduit
                    </h2>
                    <p className="text-[10px] text-slate-400 font-mono mt-0.5">Mod Integration Hub v1.0 - Plugin Sync & Tool Bridge</p>
                </div>
                <div className="flex gap-3">
                    <div className="px-3 py-1 bg-green-900/20 rounded border border-green-700/50 font-mono text-xs text-green-300 flex items-center gap-1.5">
                        <CheckCircle2 className="w-3 h-3" /> {loadedPlugins} Plugins
                    </div>
                    {conflictPlugins > 0 && (
                        <div className="px-3 py-1 bg-red-900/20 rounded border border-red-700/50 font-mono text-xs text-red-300 flex items-center gap-1.5">
                            <AlertCircle className="w-3 h-3" /> {conflictPlugins} Conflicts
                        </div>
                    )}
                </div>
            </div>

            {/* Tab Navigation */}
            <div className="flex border-b border-slate-800 bg-[#252526] px-4">
                {(['plugins', 'sync', 'tools'] as const).map((tab) => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`px-4 py-3 text-xs font-semibold border-b-2 transition-all capitalize ${
                            activeTab === tab
                                ? 'border-blue-400 text-blue-300'
                                : 'border-transparent text-slate-400 hover:text-slate-300'
                        }`}
                    >
                        {tab === 'plugins' && <span className="flex items-center gap-2"><Package className="w-3 h-3" /> Plugins</span>}
                        {tab === 'sync' && <span className="flex items-center gap-2"><Zap className="w-3 h-3" /> Sync Channels</span>}
                        {tab === 'tools' && <span className="flex items-center gap-2"><ArrowDownToLine className="w-3 h-3" /> Tools</span>}
                    </button>
                ))}
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto">
                {activeTab === 'plugins' && (
                    <div className="p-6 space-y-3">
                        <div className="text-xs text-slate-400 mb-4">
                            Load order is critical - plugins depend on their dependencies loading first. Conflicts occur when FormIDs overlap.
                        </div>
                        {SAMPLE_PLUGINS.map((plugin) => (
                            <div
                                key={plugin.id}
                                className={`border rounded-lg p-4 ${getStatusColor(plugin.status)}`}
                            >
                                <div className="flex items-start justify-between mb-2">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="font-semibold text-white">{plugin.name}</span>
                                            <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase ${
                                                plugin.type === 'master' ? 'bg-black/50' :
                                                plugin.type === 'esl' ? 'bg-blue-900/50' : 'bg-slate-800/50'
                                            }`}>
                                                {plugin.type}
                                            </span>
                                        </div>
                                        <div className="text-[10px] space-y-1">
                                            <div><span className="text-slate-500">FormID:</span> <span className="font-mono">{plugin.formId}</span></div>
                                            <div><span className="text-slate-500">Load Order:</span> <span className="font-mono">#{plugin.loadOrder}</span></div>
                                            <div><span className="text-slate-500">Version:</span> <span className="font-mono">{plugin.version}</span></div>
                                            {plugin.dependencies.length > 0 && (
                                                <div><span className="text-slate-500">Requires:</span> <span className="font-mono text-blue-300">{plugin.dependencies.join(', ')}</span></div>
                                            )}
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => handleCopyId(plugin.formId)}
                                        className="ml-2 p-1.5 hover:bg-black/30 rounded flex-shrink-0"
                                    >
                                        {copiedId === plugin.formId ? (
                                            <CheckCircle2 className="w-4 h-4 text-green-400" />
                                        ) : (
                                            <Copy className="w-4 h-4 opacity-50 hover:opacity-100" />
                                        )}
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {activeTab === 'sync' && (
                    <div className="p-6 space-y-4">
                        <div className="text-xs text-slate-400 mb-4">
                            Sync channels bridge different modding tools. Active channels automatically sync data between source and target systems.
                        </div>
                        {SAMPLE_SYNC_CHANNELS.map((channel) => (
                            <div
                                key={channel.id}
                                className={`border rounded-lg p-4 ${getStatusColor(channel.status)}`}
                            >
                                <div className="flex items-center justify-between mb-3">
                                    <h4 className="font-semibold text-white flex items-center gap-2">
                                        <Zap className="w-4 h-4" />
                                        {channel.name}
                                    </h4>
                                    <span className={`px-2 py-1 text-[9px] font-bold rounded uppercase ${
                                        channel.direction === 'bidirectional' ? 'bg-purple-900/50' :
                                        channel.direction === 'read-only' ? 'bg-green-900/50' :
                                        'bg-blue-900/50'
                                    }`}>
                                        {channel.direction.replace('-', ' ')}
                                    </span>
                                </div>
                                <div className="text-[10px] space-y-1.5">
                                    <div className="flex items-center gap-2">
                                        <span className="text-slate-500">Source:</span>
                                        <span className="font-mono text-slate-300">{channel.source}</span>
                                        <span className="text-slate-600">→</span>
                                        <span className="font-mono text-slate-300">{channel.target}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-slate-500">Last Sync:</span>
                                        <span className="font-mono">{channel.lastSync}</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {activeTab === 'tools' && (
                    <div className="p-6 space-y-3">
                        <div className="text-xs text-slate-400 mb-4">
                            Integrated tools are automatically bridged into Mossy's workflow. {installedTools} of {SAMPLE_TOOLS.length} tools installed.
                        </div>
                        {SAMPLE_TOOLS.map((tool) => (
                            <div
                                key={tool.id}
                                className={`border rounded-lg p-4 ${tool.installed ? 'bg-green-900/20 border-green-700/50' : 'bg-slate-900/20 border-slate-700/50'}`}
                            >
                                <div className="flex items-center justify-between mb-2">
                                    <div className="flex-1">
                                        <h4 className="font-semibold text-white flex items-center gap-2">
                                            {tool.installed ? (
                                                <CheckCircle2 className="w-4 h-4 text-green-400" />
                                            ) : (
                                                <ArrowDownToLine className="w-4 h-4 text-slate-400" />
                                            )}
                                            {tool.name}
                                        </h4>
                                        <p className="text-xs text-slate-400 mt-1">{tool.purpose}</p>
                                    </div>
                                    <div className="text-right ml-2 flex-shrink-0">
                                        <div className="text-[10px] text-slate-500">v{tool.version}</div>
                                        <div className={`text-[9px] font-bold uppercase mt-1 ${
                                            tool.category === 'mesh' ? 'text-cyan-300' :
                                            tool.category === 'texture' ? 'text-blue-300' :
                                            tool.category === 'script' ? 'text-yellow-300' :
                                            tool.category === 'plugin' ? 'text-purple-300' :
                                            'text-slate-300'
                                        }`}>
                                            {tool.category}
                                        </div>
                                    </div>
                                </div>
                                <div className={`flex items-center gap-1.5 text-xs mt-2 pt-2 border-t ${
                                    tool.installed ? 'border-green-700/30 text-green-300' : 'border-slate-700/30 text-slate-400'
                                }`}>
                                    {tool.installed ? (
                                        <>
                                            <CheckCircle2 className="w-3 h-3" /> Connected & Ready
                                        </>
                                    ) : (
                                        <>
                                            <AlertCircle className="w-3 h-3" /> Not Installed
                                        </>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default TheConduit;
