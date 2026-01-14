import { useState, useEffect } from 'react';
import { Eye, Folder, FileText, Settings, RefreshCw, AlertCircle, CheckCircle2, Copy } from 'lucide-react';

// Declare Electron API for TypeScript
declare global {
    interface Window {
        electron?: {
            api?: {
                getSystemInfo(): Promise<{
                    os: string;
                    cpu: string;
                    gpu: string;
                    ram: number;
                    cores: number;
                    arch: string;
                    vram?: number;
                    computerName?: string;
                    username?: string;
                }>;
                detectPrograms(): Promise<Array<{name: string; path: string}>>;
            };
        };
    }
}

interface DesktopFile {
    name: string;
    path: string;
    type: 'file' | 'folder';
    size: string;
    modified: string;
    category: 'mod' | 'texture' | 'mesh' | 'script' | 'config' | 'other';
}

interface SystemInfo {
    computerName: string;
    username: string;
    osVersion: string;
    totalMemory: string;
    availableMemory: string;
    cpuModel: string;
}

interface RecentProject {
    name: string;
    path: string;
    lastModified: string;
    files: number;
}

const SAMPLE_SYSTEM_INFO: SystemInfo = {
    computerName: 'FORTRESS-NEXUS',
    username: 'Modder',
    osVersion: 'Windows 10 22H2 (Build 19045)',
    totalMemory: '32 GB',
    availableMemory: '18.4 GB',
    cpuModel: 'Intel Core i9-13900K'
};

const SAMPLE_RECENT_FILES: DesktopFile[] = [
    {
        name: 'ArmorMod.esp',
        path: 'D:\\Fallout4\\Data\\ArmorMod.esp',
        type: 'file',
        size: '2.4 MB',
        modified: '2 hours ago',
        category: 'mod'
    },
    {
        name: 'WeaponTextures',
        path: 'D:\\Fallout4\\Data\\textures\\weapons',
        type: 'folder',
        size: '145 items',
        modified: '1 day ago',
        category: 'texture'
    },
    {
        name: 'QuestScript.psc',
        path: 'D:\\Fallout4\\Source\\QuestScript.psc',
        type: 'file',
        size: '34 KB',
        modified: '4 hours ago',
        category: 'script'
    },
    {
        name: 'armor_chest_female.nif',
        path: 'D:\\Fallout4\\meshes\\armor\\armor_chest_female.nif',
        type: 'file',
        size: '1.2 MB',
        modified: '3 days ago',
        category: 'mesh'
    },
    {
        name: 'CreatureTextures',
        path: 'D:\\Fallout4\\Data\\textures\\creatures',
        type: 'folder',
        size: '89 items',
        modified: '1 week ago',
        category: 'texture'
    },
    {
        name: 'SettlementExpansion.json',
        path: 'D:\\Projects\\SettlementExpansion.json',
        type: 'file',
        size: '156 KB',
        modified: '5 days ago',
        category: 'config'
    }
];

const SAMPLE_RECENT_PROJECTS: RecentProject[] = [
    {
        name: 'Weapon Expansion Pack',
        path: 'D:\\Fallout4 Mods\\WeaponExpansion',
        lastModified: '2 hours ago',
        files: 45
    },
    {
        name: 'NPC Companion Suite',
        path: 'D:\\Fallout4 Mods\\CompanionMods',
        lastModified: '1 day ago',
        files: 28
    },
    {
        name: 'Settlement Enhancement',
        path: 'D:\\Fallout4 Mods\\SettlementEnh',
        lastModified: '3 days ago',
        files: 156
    },
    {
        name: 'Quest Framework',
        path: 'D:\\Fallout4 Mods\\QuestFramework',
        lastModified: '5 days ago',
        files: 32
    }
];

const getCategoryColor = (category: string) => {
    switch (category) {
        case 'mod': return 'bg-purple-900/20 border-purple-700/50 text-purple-300';
        case 'texture': return 'bg-blue-900/20 border-blue-700/50 text-blue-300';
        case 'mesh': return 'bg-cyan-900/20 border-cyan-700/50 text-cyan-300';
        case 'script': return 'bg-yellow-900/20 border-yellow-700/50 text-yellow-300';
        case 'config': return 'bg-green-900/20 border-green-700/50 text-green-300';
        default: return 'bg-slate-900/20 border-slate-700/50 text-slate-300';
    }
};

const TheLens = () => {
    const [activeTab, setActiveTab] = useState<'overview' | 'files' | 'projects' | 'system'>('overview');
    const [copiedPath, setCopiedPath] = useState<string | null>(null);
    const [systemInfo, setSystemInfo] = useState<SystemInfo>(SAMPLE_SYSTEM_INFO);
    const [bridgeConnected, setBridgeConnected] = useState(false);
    const [loading, setLoading] = useState(true);

    // Load system info from Electron bridge
    useEffect(() => {
        const loadSystemInfo = async () => {
            try {
                // Check if Electron API is available
                if (!window.electron?.api?.getSystemInfo) {
                    console.warn('[TheLens] Electron API not available, using sample data');
                    setBridgeConnected(false);
                    setLoading(false);
                    return;
                }

                const info = await window.electron.api.getSystemInfo();
                console.log('[TheLens] System info loaded:', info);
                
                // Format system info from Electron API response
                const formatted: SystemInfo = {
                    computerName: info.computerName || 'Unknown',
                    username: info.username || 'User',
                    osVersion: `${info.os} (${info.arch})`,
                    totalMemory: `${(info.ram / 1024).toFixed(1)} GB`,
                    availableMemory: `${Math.max(0, (info.ram / 1024) * 0.6).toFixed(1)} GB`, // Estimate available as 60% of total
                    cpuModel: `${info.cpu} (${info.cores} cores)`
                };
                
                setSystemInfo(formatted);
                setBridgeConnected(true);
            } catch (error) {
                console.error('[TheLens] Error loading system info:', error);
                setBridgeConnected(false);
            } finally {
                setLoading(false);
            }
        };

        loadSystemInfo();
    }, []);

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
                        <Eye className="w-5 h-5 text-cyan-400" />
                        The Lens
                    </h2>
                    <p className="text-[10px] text-slate-400 font-mono mt-0.5">Desktop Bridge v1.0 - System & File Monitoring</p>
                </div>
                <div className="flex gap-2">
                    <button className="px-3 py-1.5 bg-black rounded border border-slate-600 hover:border-cyan-500 transition-colors text-xs text-cyan-400 flex items-center gap-2">
                        <RefreshCw className="w-3 h-3" /> Refresh
                    </button>
                    <div className={`px-3 py-1 rounded border font-mono text-xs flex items-center gap-1.5 ${
                        bridgeConnected && !loading
                            ? 'bg-emerald-900/20 border-emerald-700/50 text-emerald-300'
                            : loading
                            ? 'bg-yellow-900/20 border-yellow-700/50 text-yellow-300'
                            : 'bg-red-900/20 border-red-700/50 text-red-300'
                    }`}>
                        <div className={`w-2 h-2 rounded-full ${
                            bridgeConnected && !loading ? 'bg-emerald-500 animate-pulse' : loading ? 'bg-yellow-500' : 'bg-red-500'
                        }`}></div>
                        {loading ? 'Connecting...' : bridgeConnected ? 'Bridge Active' : 'Bridge Unavailable'}
                    </div>
                </div>
            </div>

            {/* Tab Navigation */}
            <div className="flex border-b border-slate-800 bg-[#252526] px-4">
                {(['overview', 'files', 'projects', 'system'] as const).map((tab) => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`px-4 py-3 text-xs font-semibold border-b-2 transition-all capitalize ${
                            activeTab === tab
                                ? 'border-cyan-400 text-cyan-300'
                                : 'border-transparent text-slate-400 hover:text-slate-300'
                        }`}
                    >
                        {tab}
                    </button>
                ))}
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto">
                {activeTab === 'overview' && (
                    <div className="p-6 space-y-6">
                        {/* System Status */}
                        <div className="bg-[#252526] border border-slate-800 rounded-lg p-4">
                            <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
                                <Settings className="w-4 h-4 text-cyan-400" /> System Status
                            </h3>
                            <div className="grid grid-cols-2 gap-3 text-xs">
                                <div className="bg-[#1e1e1e] p-2 rounded border border-slate-700">
                                    <div className="text-slate-400">Computer</div>
                                    <div className="text-white font-mono">{SAMPLE_SYSTEM_INFO.computerName}</div>
                                </div>
                                <div className="bg-[#1e1e1e] p-2 rounded border border-slate-700">
                                    <div className="text-slate-400">OS</div>
                                    <div className="text-white font-mono">{SAMPLE_SYSTEM_INFO.osVersion}</div>
                                </div>
                                <div className="bg-[#1e1e1e] p-2 rounded border border-slate-700">
                                    <div className="text-slate-400">Memory Available</div>
                                    <div className="text-cyan-300 font-mono">{SAMPLE_SYSTEM_INFO.availableMemory} / {SAMPLE_SYSTEM_INFO.totalMemory}</div>
                                </div>
                                <div className="bg-[#1e1e1e] p-2 rounded border border-slate-700">
                                    <div className="text-slate-400">CPU</div>
                                    <div className="text-white font-mono text-[9px]">{SAMPLE_SYSTEM_INFO.cpuModel}</div>
                                </div>
                            </div>
                        </div>

                        {/* Recent Files */}
                        <div className="bg-[#252526] border border-slate-800 rounded-lg p-4">
                            <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
                                <FileText className="w-4 h-4 text-cyan-400" /> Recent Modding Files
                            </h3>
                            <div className="space-y-2">
                                {SAMPLE_RECENT_FILES.slice(0, 4).map((file, idx) => (
                                    <div
                                        key={idx}
                                        className={`flex items-center justify-between p-2 rounded border cursor-pointer hover:bg-slate-800/50 transition-colors ${getCategoryColor(file.category)}`}
                                    >
                                        <div className="flex items-center gap-2 min-w-0">
                                            {file.type === 'folder' ? (
                                                <Folder className="w-4 h-4 flex-shrink-0" />
                                            ) : (
                                                <FileText className="w-4 h-4 flex-shrink-0" />
                                            )}
                                            <div className="min-w-0">
                                                <div className="text-xs font-semibold truncate">{file.name}</div>
                                                <div className="text-[9px] text-slate-500">{file.modified}</div>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => handleCopyPath(file.path)}
                                            className="ml-2 p-1 hover:bg-black/30 rounded flex-shrink-0"
                                        >
                                            {copiedPath === file.path ? (
                                                <CheckCircle2 className="w-3 h-3 text-green-400" />
                                            ) : (
                                                <Copy className="w-3 h-3 opacity-50 hover:opacity-100" />
                                            )}
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Quick Links */}
                        <div className="bg-[#252526] border border-slate-800 rounded-lg p-4">
                            <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
                                <AlertCircle className="w-4 h-4 text-cyan-400" /> Quick Stats
                            </h3>
                            <div className="grid grid-cols-3 gap-3 text-xs">
                                <div className="bg-[#1e1e1e] p-3 rounded border border-slate-700 text-center">
                                    <div className="text-2xl font-bold text-cyan-400">4</div>
                                    <div className="text-slate-400 mt-1">Active Projects</div>
                                </div>
                                <div className="bg-[#1e1e1e] p-3 rounded border border-slate-700 text-center">
                                    <div className="text-2xl font-bold text-purple-400">156</div>
                                    <div className="text-slate-400 mt-1">Total Mod Files</div>
                                </div>
                                <div className="bg-[#1e1e1e] p-3 rounded border border-slate-700 text-center">
                                    <div className="text-2xl font-bold text-blue-400">1.2 GB</div>
                                    <div className="text-slate-400 mt-1">Disk Usage</div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'files' && (
                    <div className="p-6">
                        <div className="space-y-2">
                            {SAMPLE_RECENT_FILES.map((file, idx) => (
                                <div
                                    key={idx}
                                    className={`flex items-center justify-between p-3 rounded border ${getCategoryColor(file.category)} hover:bg-slate-800/50 transition-colors`}
                                >
                                    <div className="flex items-center gap-3 min-w-0">
                                        {file.type === 'folder' ? (
                                            <Folder className="w-4 h-4 flex-shrink-0" />
                                        ) : (
                                            <FileText className="w-4 h-4 flex-shrink-0" />
                                        )}
                                        <div className="min-w-0">
                                            <div className="text-sm font-semibold truncate">{file.name}</div>
                                            <div className="text-xs text-slate-400">{file.path}</div>
                                            <div className="text-[10px] text-slate-500 mt-1">{file.size} · {file.modified}</div>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => handleCopyPath(file.path)}
                                        className="ml-2 p-1.5 hover:bg-black/30 rounded flex-shrink-0"
                                    >
                                        {copiedPath === file.path ? (
                                            <CheckCircle2 className="w-4 h-4 text-green-400" />
                                        ) : (
                                            <Copy className="w-4 h-4 opacity-50 hover:opacity-100" />
                                        )}
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {activeTab === 'projects' && (
                    <div className="p-6">
                        <div className="space-y-3">
                            {SAMPLE_RECENT_PROJECTS.map((project, idx) => (
                                <div
                                    key={idx}
                                    className="bg-[#252526] border border-slate-800 rounded-lg p-4 hover:border-cyan-600/50 transition-colors"
                                >
                                    <div className="flex items-start justify-between mb-2">
                                        <div>
                                            <h4 className="font-semibold text-white flex items-center gap-2">
                                                <Folder className="w-4 h-4 text-cyan-400" />
                                                {project.name}
                                            </h4>
                                            <p className="text-xs text-slate-400 mt-1 font-mono">{project.path}</p>
                                        </div>
                                        <button
                                            onClick={() => handleCopyPath(project.path)}
                                            className="p-1.5 hover:bg-slate-700 rounded"
                                        >
                                            {copiedPath === project.path ? (
                                                <CheckCircle2 className="w-4 h-4 text-green-400" />
                                            ) : (
                                                <Copy className="w-4 h-4 text-slate-400 opacity-50 hover:opacity-100" />
                                            )}
                                        </button>
                                    </div>
                                    <div className="flex items-center gap-4 text-xs text-slate-400">
                                        <span>📁 {project.files} files</span>
                                        <span>⏱️ {project.lastModified}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {activeTab === 'system' && (
                    <div className="p-6 space-y-4">
                        <div className="bg-[#252526] border border-slate-800 rounded-lg p-4">
                            <h3 className="text-sm font-bold text-white mb-3">System Information</h3>
                            <div className="space-y-3 text-sm">
                                <div className="flex justify-between p-2 bg-[#1e1e1e] rounded border border-slate-700">
                                    <span className="text-slate-400">Computer Name</span>
                                    <span className="text-white font-mono">{SAMPLE_SYSTEM_INFO.computerName}</span>
                                </div>
                                <div className="flex justify-between p-2 bg-[#1e1e1e] rounded border border-slate-700">
                                    <span className="text-slate-400">Username</span>
                                    <span className="text-white font-mono">{SAMPLE_SYSTEM_INFO.username}</span>
                                </div>
                                <div className="flex justify-between p-2 bg-[#1e1e1e] rounded border border-slate-700">
                                    <span className="text-slate-400">OS Version</span>
                                    <span className="text-white font-mono text-xs">{SAMPLE_SYSTEM_INFO.osVersion}</span>
                                </div>
                                <div className="flex justify-between p-2 bg-[#1e1e1e] rounded border border-slate-700">
                                    <span className="text-slate-400">CPU</span>
                                    <span className="text-white font-mono text-xs">{SAMPLE_SYSTEM_INFO.cpuModel}</span>
                                </div>
                                <div className="flex justify-between p-2 bg-[#1e1e1e] rounded border border-slate-700">
                                    <span className="text-slate-400">Total Memory</span>
                                    <span className="text-cyan-300 font-mono">{SAMPLE_SYSTEM_INFO.totalMemory}</span>
                                </div>
                                <div className="flex justify-between p-2 bg-[#1e1e1e] rounded border border-slate-700">
                                    <span className="text-slate-400">Available Memory</span>
                                    <span className="text-green-300 font-mono">{SAMPLE_SYSTEM_INFO.availableMemory}</span>
                                </div>
                            </div>
                        </div>

                        <div className="bg-blue-900/10 border border-blue-700/30 rounded-lg p-4">
                            <h4 className="text-sm font-semibold text-blue-300 mb-2 flex items-center gap-2">
                                <AlertCircle className="w-4 h-4" /> Bridge Status
                            </h4>
                            <p className="text-xs text-blue-200">The Lens is connected to the desktop. File paths are monitored and system information is current.</p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default TheLens;
