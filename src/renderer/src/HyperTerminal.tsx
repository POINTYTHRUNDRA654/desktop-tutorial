import { useState } from 'react';
import { Terminal, Copy, CheckCircle2, AlertTriangle, Download, Zap, FileText, PlayCircle } from 'lucide-react';

interface Command {
    id: string;
    category: 'xedit' | 'papyrus' | 'mesh' | 'texture' | 'utility';
    name: string;
    description: string;
    command: string;
    parameters?: string;
    purpose: string;
    riskLevel: 'low' | 'medium' | 'high';
}

const SAMPLE_COMMANDS: Command[] = [
    {
        id: 'xedit-1',
        category: 'xedit',
        name: 'Clean Masters',
        description: 'Remove unused FormIDs and optimize master files.',
        command: 'xEdit -quickautoclean',
        purpose: 'Reduces plugin file size and removes orphaned records. Safe to run on any ESP/ESM.',
        riskLevel: 'low'
    },
    {
        id: 'xedit-2',
        category: 'xedit',
        name: 'Rebuild Levelists',
        description: 'Automatically rebuild leveled lists when adding new items.',
        command: 'xEdit -rebuildlevels -quiet',
        purpose: 'Ensures newly created weapons/armor appear in leveled lists. Required after item additions.',
        riskLevel: 'low'
    },
    {
        id: 'xedit-3',
        category: 'xedit',
        name: 'Batch Export FormIDs',
        description: 'Export all FormIDs from a plugin to text file for reference.',
        command: 'xEdit -backup:0 YourMod.esp -o:"FormID_Export.txt"',
        purpose: 'Creates reference document for all FormIDs in your mod. Useful for debugging scripts.',
        riskLevel: 'low'
    },
    {
        id: 'papyrus-1',
        category: 'papyrus',
        name: 'Compile All Scripts',
        description: 'Compile all Papyrus scripts in Source folder.',
        command: 'cd D:\\Fallout4\\Papyrus && PapyrusCompiler.exe -optimize -final "D:\\Fallout4\\Data\\Scripts\\Source" -o "D:\\Fallout4\\Data\\Scripts" -import="D:\\Fallout4\\Data\\Scripts\\Source"',
        purpose: 'Creates PEX bytecode from PSC source files. Required before loading mod in-game.',
        riskLevel: 'low'
    },
    {
        id: 'papyrus-2',
        category: 'papyrus',
        name: 'Check Script Syntax',
        description: 'Verify Papyrus script syntax without compiling.',
        command: 'PapyrusCompiler.exe -syntax YourScript.psc',
        purpose: 'Fast validation of script syntax. Catches errors before full compilation.',
        riskLevel: 'low'
    },
    {
        id: 'mesh-1',
        category: 'mesh',
        name: 'Batch NIF Validation',
        description: 'Run NIF files through Splicer validator for mesh issues.',
        command: 'for /R "D:\\Fallout4\\meshes\\mymod" %%F in (*.nif) do echo Validating %%F && blender --background "%%F" --python validate_nif.py',
        purpose: 'Checks all NIFs for duplicate vertices, degenerate triangles, inverted normals.',
        riskLevel: 'medium'
    },
    {
        id: 'mesh-2',
        category: 'mesh',
        name: 'Regenerate NIF Physics',
        description: 'Rebuild Havok physics colliders for all NIFs in folder.',
        command: 'OutfitStudio -i "D:\\Fallout4\\meshes\\mymod" -regenerate-physics -o "D:\\Fallout4\\meshes\\mymod_physics"',
        purpose: 'Updates collision shapes to match visual geometry. Prevents player clipping.',
        riskLevel: 'medium'
    },
    {
        id: 'texture-1',
        category: 'texture',
        name: 'Resize Textures to 2K',
        description: 'Batch downscale 4K textures to 2K for performance.',
        command: 'magick mogrify -resize 2048x2048 "D:\\Fallout4\\textures\\mymod\\*.dds"',
        purpose: 'Reduces VRAM usage by 75% while maintaining acceptable quality. Prevents VRAM crashes.',
        riskLevel: 'low'
    },
    {
        id: 'texture-2',
        category: 'texture',
        name: 'Convert DDS Compression',
        description: 'Convert all DDS to DXT5 compression for transparency.',
        command: 'for /R "D:\\Fallout4\\textures\\mymod" %%F in (*.dds) do texconv -f BC5_UNORM "%%F"',
        purpose: 'Ensures proper texture compression format. BC5 for normals, BC1 for opaque, BC3 for alpha.',
        riskLevel: 'low'
    },
    {
        id: 'utility-1',
        category: 'utility',
        name: 'Backup Mod Folder',
        description: 'Create timestamped backup of entire mod project.',
        command: 'powershell -Command "$timestamp = Get-Date -Format \'yyyyMMdd_HHmmss\'; Copy-Item -Path \'D:\\Fallout4 Mods\\MyMod\' -Destination \'D:\\Backups\\MyMod_$timestamp\' -Recurse"',
        purpose: 'Saves complete copy of mod before major changes. Allows rollback if something breaks.',
        riskLevel: 'low'
    },
    {
        id: 'utility-2',
        category: 'utility',
        name: 'Generate Load Order Report',
        description: 'Create detailed report of your mod load order with conflicts.',
        command: 'python generate_load_order_report.py > LoadOrder_Report.txt 2>&1',
        purpose: 'Documents all plugins, dependencies, and potential conflicts. Useful for troubleshooting.',
        riskLevel: 'low'
    }
];

const getCategoryColor = (category: string) => {
    switch (category) {
        case 'xedit': return 'bg-purple-900/20 border-purple-700/50 text-purple-300';
        case 'papyrus': return 'bg-yellow-900/20 border-yellow-700/50 text-yellow-300';
        case 'mesh': return 'bg-cyan-900/20 border-cyan-700/50 text-cyan-300';
        case 'texture': return 'bg-blue-900/20 border-blue-700/50 text-blue-300';
        case 'utility': return 'bg-green-900/20 border-green-700/50 text-green-300';
        default: return 'bg-slate-900/20 border-slate-700/50 text-slate-300';
    }
};

const HyperTerminal = () => {
    const [selectedCategory, setSelectedCategory] = useState<'all' | 'xedit' | 'papyrus' | 'mesh' | 'texture' | 'utility'>('all');
    const [copiedId, setCopiedId] = useState<string | null>(null);
    const [expandedId, setExpandedId] = useState<string | null>(null);

    const handleCopyCommand = (id: string, command: string) => {
        navigator.clipboard.writeText(command);
        setCopiedId(id);
        setTimeout(() => setCopiedId(null), 2000);
    };

    const filteredCommands = selectedCategory === 'all'
        ? SAMPLE_COMMANDS
        : SAMPLE_COMMANDS.filter(cmd => cmd.category === selectedCategory);

    const categories = [
        { id: 'xedit', label: 'xEdit', color: 'text-purple-400' },
        { id: 'papyrus', label: 'Papyrus', color: 'text-yellow-400' },
        { id: 'mesh', label: 'Mesh', color: 'text-cyan-400' },
        { id: 'texture', label: 'Texture', color: 'text-blue-400' },
        { id: 'utility', label: 'Utility', color: 'text-green-400' }
    ];

    return (
        <div className="h-full flex flex-col bg-[#1e1e1e] text-slate-200 font-sans overflow-hidden">
            {/* Header */}
            <div className="p-4 border-b border-black bg-[#2d2d2d] flex justify-between items-center shadow-md">
                <div>
                    <h2 className="text-lg font-bold text-white flex items-center gap-2">
                        <Terminal className="w-5 h-5 text-green-400" />
                        HyperTerminal
                    </h2>
                    <p className="text-[10px] text-slate-400 font-mono mt-0.5">Batch Command Generator v1.0 - Pre-built modding workflows</p>
                </div>
                <div className="flex gap-2">
                    <button className="px-3 py-1.5 bg-black rounded border border-slate-600 hover:border-green-500 transition-colors text-xs text-green-400 flex items-center gap-2">
                        <Download className="w-3 h-3" /> Export
                    </button>
                </div>
            </div>

            {/* Category Filter */}
            <div className="flex border-b border-slate-800 bg-[#252526] px-4 py-3 gap-2 overflow-x-auto">
                <button
                    onClick={() => setSelectedCategory('all')}
                    className={`px-3 py-1 rounded text-xs font-semibold whitespace-nowrap transition-all ${
                        selectedCategory === 'all'
                            ? 'bg-slate-700 text-white border border-slate-600'
                            : 'bg-slate-800/50 text-slate-400 border border-slate-700 hover:text-slate-300'
                    }`}
                >
                    All ({SAMPLE_COMMANDS.length})
                </button>
                {categories.map((cat) => {
                    const count = SAMPLE_COMMANDS.filter(cmd => cmd.category === cat.id).length;
                    return (
                        <button
                            key={cat.id}
                            onClick={() => setSelectedCategory(cat.id as any)}
                            className={`px-3 py-1 rounded text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                                selectedCategory === cat.id
                                    ? `bg-slate-700 text-white border border-slate-600`
                                    : `bg-slate-800/50 text-slate-400 border border-slate-700 hover:text-slate-300`
                            }`}
                        >
                            <span className={cat.color}>●</span>
                            {cat.label} ({count})
                        </button>
                    );
                })}
            </div>

            {/* Command List */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
                {filteredCommands.map((cmd) => (
                    <div
                        key={cmd.id}
                        className={`border rounded-lg transition-all ${getCategoryColor(cmd.category)}`}
                    >
                        <div
                            className="p-4 cursor-pointer hover:bg-black/20"
                            onClick={() => setExpandedId(expandedId === cmd.id ? null : cmd.id)}
                        >
                            <div className="flex items-start justify-between mb-2">
                                <div className="flex-1">
                                    <h3 className="font-semibold text-white flex items-center gap-2">
                                        <Zap className="w-4 h-4" />
                                        {cmd.name}
                                    </h3>
                                    <p className="text-xs text-slate-300 mt-1">{cmd.description}</p>
                                </div>
                                <div className="ml-3 flex flex-col items-end gap-1.5 flex-shrink-0">
                                    <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase ${
                                        cmd.riskLevel === 'low' ? 'bg-green-900/50' :
                                        cmd.riskLevel === 'medium' ? 'bg-yellow-900/50' :
                                        'bg-red-900/50'
                                    }`}>
                                        {cmd.riskLevel} Risk
                                    </span>
                                    <span className="text-[9px] text-slate-400 uppercase font-mono">{cmd.category}</span>
                                </div>
                            </div>
                        </div>

                        {expandedId === cmd.id && (
                            <div className="border-t border-current/20 bg-black/30 p-4 space-y-3">
                                <div>
                                    <div className="text-[10px] font-semibold text-slate-300 mb-2 flex items-center gap-2">
                                        <Terminal className="w-3 h-3" /> Command
                                    </div>
                                    <div className="bg-[#1e1e1e] border border-slate-700 rounded p-3 font-mono text-[11px] text-green-300 overflow-x-auto">
                                        {cmd.command}
                                    </div>
                                </div>

                                <div>
                                    <div className="text-[10px] font-semibold text-slate-300 mb-2 flex items-center gap-2">
                                        <FileText className="w-3 h-3" /> Purpose
                                    </div>
                                    <p className="text-xs text-slate-300">{cmd.purpose}</p>
                                </div>

                                {cmd.parameters && (
                                    <div>
                                        <div className="text-[10px] font-semibold text-slate-300 mb-2">Parameters</div>
                                        <p className="text-xs text-slate-300">{cmd.parameters}</p>
                                    </div>
                                )}

                                <div className="flex items-center gap-2 pt-2 border-t border-current/20">
                                    <button
                                        onClick={() => handleCopyCommand(cmd.id, cmd.command)}
                                        className="flex-1 px-3 py-2 bg-green-900/30 hover:bg-green-900/50 rounded border border-green-700/50 text-xs font-semibold text-green-300 flex items-center justify-center gap-2 transition-colors"
                                    >
                                        {copiedId === cmd.id ? (
                                            <>
                                                <CheckCircle2 className="w-3 h-3" /> Copied!
                                            </>
                                        ) : (
                                            <>
                                                <Copy className="w-3 h-3" /> Copy Command
                                            </>
                                        )}
                                    </button>
                                    <button className="px-3 py-2 bg-slate-800 hover:bg-slate-700 rounded border border-slate-700 text-xs font-semibold text-slate-300 flex items-center gap-2 transition-colors">
                                        <PlayCircle className="w-3 h-3" /> Execute
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                ))}
            </div>

            {/* Footer Info */}
            <div className="border-t border-slate-800 bg-[#252526] p-4 text-[10px] text-slate-400 space-y-1">
                <div className="flex items-center gap-2">
                    <AlertTriangle className="w-3 h-3 text-yellow-400" />
                    <span>Review commands before executing. Some operations are destructive and cannot be undone.</span>
                </div>
                <div className="text-[9px] text-slate-500 ml-5">
                    High-risk commands should be used only after backing up your mod folder.
                </div>
            </div>
        </div>
    );
};

export default HyperTerminal;
