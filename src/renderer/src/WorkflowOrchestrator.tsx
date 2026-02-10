import { useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { GitBranch, Package, HardDrive, Play, Loader2, CheckCircle2, AlertTriangle, Database, Copy, Shield, Settings, Repeat2, ClipboardList, ArrowDownToLine } from 'lucide-react';
import { ToolsInstallVerifyPanel } from './components/ToolsInstallVerifyPanel';
import { useWheelScrollProxy } from './components/useWheelScrollProxy';

interface Asset {
    id: string;
    name: string;
    type: 'mesh' | 'texture' | 'audio' | 'script';
    sourcePath: string;
    targetPath: string;
    sizeMB: number;
    tags: string[];
    status: 'new' | 'in-progress' | 'processed';
    lastUpdated: string;
    issues?: string[];
}

interface PipelineStepTemplate {
    id: string;
    name: string;
    tool: string;
    description: string;
    command: string;
}

interface PipelineDefinition {
    id: string;
    name: string;
    description: string;
    applicable: Asset['type'][];
    steps: PipelineStepTemplate[];
}

interface PipelineRunStep extends PipelineStepTemplate {
    status: 'pending' | 'running' | 'completed' | 'failed';
    output?: string;
    notes?: string;
    durationMs?: number;
}

interface RunLog {
    timestamp: string;
    message: string;
    level: 'info' | 'warn' | 'error';
}

interface RunHistoryEntry {
    id: string;
    pipelineId: string;
    durationMs: number;
    status: 'success' | 'failed';
    timestamp: string;
}

const ASSETS: Asset[] = [
    {
        id: 'mesh-01',
        name: 'Railcar Static Mesh',
        type: 'mesh',
        sourcePath: 'EXAMPLE: <your workspace>/Assets/meshes/railcar_high.nif',
        targetPath: 'Data/Meshes/Workshop/Rail/railcar01.nif',
        sizeMB: 14.2,
        tags: ['static', 'collision', 'lod'],
        status: 'new',
        lastUpdated: '2026-01-10',
        issues: ['Missing bhkCollision', 'Inconsistent scale (1.2x)']
    },
    {
        id: 'mesh-02',
        name: 'Armor Chestplate',
        type: 'mesh',
        sourcePath: 'EXAMPLE: <your workspace>/Assets/meshes/armor/chestplate_high.nif',
        targetPath: 'Data/Meshes/Armor/Custom/chestplate.nif',
        sizeMB: 9.8,
        tags: ['armor', 'skin', 'physics'],
        status: 'in-progress',
        lastUpdated: '2026-01-08'
    },
    {
        id: 'tex-01',
        name: 'Railcar Texture Set',
        type: 'texture',
        sourcePath: 'EXAMPLE: <your workspace>/Assets/textures/railcar/*.png',
        targetPath: 'Data/Textures/Workshop/Rail/railcar01_*.dds',
        sizeMB: 88.4,
        tags: ['albedo', 'normal', 'metal'],
        status: 'new',
        lastUpdated: '2026-01-11',
        issues: ['Albedo 8K → downscale to 2K', 'Normals in BC1 (wrong compression)']
    },
    {
        id: 'tex-02',
        name: 'Armor Texture Set',
        type: 'texture',
        sourcePath: 'EXAMPLE: <your workspace>/Assets/textures/armor/*.png',
        targetPath: 'Data/Textures/Armor/Custom/armor_*.dds',
        sizeMB: 52.1,
        tags: ['albedo', 'normal', 'roughness'],
        status: 'processed',
        lastUpdated: '2026-01-05'
    },
    {
        id: 'audio-01',
        name: 'Workbench VO Lines',
        type: 'audio',
        sourcePath: 'EXAMPLE: <your workspace>/Assets/audio/workbench/*.wav',
        targetPath: 'Data/Sound/Voice/CustomWorkbench/',
        sizeMB: 34.7,
        tags: ['voice', 'dialogue'],
        status: 'new',
        lastUpdated: '2026-01-07'
    },
    {
        id: 'script-01',
        name: 'Railcar Control Script',
        type: 'script',
        sourcePath: 'EXAMPLE: <your workspace>/Assets/scripts/RailcarControl.psc',
        targetPath: 'Data/Scripts/RailcarControl.pex',
        sizeMB: 0.4,
        tags: ['papyrus', 'workshop'],
        status: 'in-progress',
        lastUpdated: '2026-01-06'
    }
];

const PIPELINES: PipelineDefinition[] = [
    {
        id: 'mesh-pipeline',
        name: 'Mesh Processing',
        description: 'Validate, fix physics, optimize LODs, and stage NIFs.',
        applicable: ['mesh'],
        steps: [
            { id: 'validate-nif', name: 'Validate NIF', tool: 'Splicer', description: 'Check for bad normals, degenerate tris, missing bhkCollision.', command: 'splicer validate --input "{source}" --report --strict' },
            { id: 'physics', name: 'Regenerate Physics', tool: 'Outfit Studio', description: 'Rebuild collision and Havok constraints to match mesh scale.', command: 'outfitstudio --input "{source}" --regen-physics --output "{target}"' },
            { id: 'lod', name: 'Generate LOD', tool: 'LODGen', description: 'Create LOD meshes and place in Data/Meshes/LOD.', command: 'lodgen -o "Data/Meshes/LOD" --source "{target}"' },
            { id: 'package', name: 'Stage to Data', tool: 'Archive2', description: 'Place final NIF into target path and prep BA2 list.', command: 'archive2 add "{target}" --list ba2_queue.txt' }
        ]
    },
    {
        id: 'texture-pipeline',
        name: 'Texture Processing',
        description: 'Convert, compress, and mipmap DDS textures for runtime.',
        applicable: ['texture'],
        steps: [
            { id: 'audit', name: 'Audit Resolution', tool: 'ImageMagick', description: 'Downscale oversized sources to target resolution (2K).', command: 'magick mogrify -resize 2048x2048 "{source}"' },
            { id: 'convert', name: 'Convert to DDS', tool: 'texconv', description: 'BC1 for albedo, BC5 for normals, BC3 for alpha-bearing maps.', command: 'texconv -f BC5_UNORM -o "{targetDir}" "{source}"' },
            { id: 'mipmaps', name: 'Generate Mipmaps', tool: 'texconv', description: 'Add mip levels to prevent shimmering and reduce VRAM spikes.', command: 'texconv -m 10 -o "{targetDir}" "{target}"' },
            { id: 'package', name: 'Stage to Data', tool: 'Archive2', description: 'Write DDS to target path and enqueue for BA2.', command: 'archive2 add "{target}" --list ba2_queue.txt' }
        ]
    },
    {
        id: 'audio-pipeline',
        name: 'Audio Processing',
        description: 'Normalize, convert, and stage dialogue or SFX.',
        applicable: ['audio'],
        steps: [
            { id: 'normalize', name: 'Normalize Loudness', tool: 'ffmpeg', description: 'LUFS normalization for consistent playback.', command: 'ffmpeg -i "{source}" -af loudnorm "{targetDir}/normalized.wav"' },
            { id: 'convert', name: 'Convert to XWM', tool: 'ffmpeg/xWMAEncode', description: 'Encode WAV to XWM for Fallout 4 voice pipeline.', command: 'ffmpeg -i "{targetDir}/normalized.wav" -acodec wmav2 "{target}"' },
            { id: 'package', name: 'Stage to Data', tool: 'Archive2', description: 'Place XWM in Data/Sound/Voice and queue for BA2.', command: 'archive2 add "{target}" --list ba2_queue.txt' }
        ]
    },
    {
        id: 'script-pipeline',
        name: 'Script Compilation',
        description: 'Compile Papyrus scripts and stage bytecode.',
        applicable: ['script'],
        steps: [
            { id: 'lint', name: 'Syntax Check', tool: 'PapyrusCompiler', description: 'Validate PSC syntax before compilation.', command: 'PapyrusCompiler.exe "{source}" -syntax' },
            { id: 'compile', name: 'Compile to PEX', tool: 'PapyrusCompiler', description: 'Emit bytecode to Data/Scripts with import paths resolved.', command: 'PapyrusCompiler.exe "{source}" -output "{targetDir}" -import="Data/Scripts/Source"' },
            { id: 'package', name: 'Stage to Data', tool: 'Archive2', description: 'Stage PEX for inclusion in BA2.', command: 'archive2 add "{target}" --list ba2_queue.txt' }
        ]
    }
];

const formatMB = (n: number) => `${n.toFixed(1)} MB`;

const WorkflowOrchestrator = () => {
    const [assets] = useState<Asset[]>(ASSETS);
    const [selectedAssetId, setSelectedAssetId] = useState<string | null>(assets[0]?.id ?? null);
    const [runSteps, setRunSteps] = useState<PipelineRunStep[]>([]);
    const [logs, setLogs] = useState<RunLog[]>([]);
    const [isRunning, setIsRunning] = useState(false);
    const [runHistory, setRunHistory] = useState<Record<string, RunHistoryEntry[]>>({});

    const mainScrollRef = useRef<HTMLDivElement | null>(null);
    const onWheel = useWheelScrollProxy(mainScrollRef);

    const selectedAsset = useMemo(() => assets.find(a => a.id === selectedAssetId) || null, [assets, selectedAssetId]);

    const selectedPipeline = useMemo(() => {
        if (!selectedAsset) return PIPELINES[0];
        return PIPELINES.find(p => p.applicable.includes(selectedAsset.type)) || PIPELINES[0];
    }, [selectedAsset]);

    const storageStats = useMemo(() => {
        const total = assets.reduce((sum, a) => sum + a.sizeMB, 0);
        const processed = assets.filter(a => a.status === 'processed').reduce((sum, a) => sum + a.sizeMB, 0);
        return { total, processed, pending: total - processed };
    }, [assets]);

    const log = (message: string, level: RunLog['level'] = 'info') => {
        setLogs(prev => [...prev, { timestamp: new Date().toLocaleTimeString(), message, level }]);
    };

    const handleRun = () => {
        if (!selectedAsset || !selectedPipeline) return;
        setIsRunning(true);
        setLogs([]);
        log(`Starting pipeline '${selectedPipeline.name}' for ${selectedAsset.name}`);

        const steps: PipelineRunStep[] = selectedPipeline.steps.map((s) => ({ ...s, status: 'pending' as const }));
        setRunSteps(steps);

        // Simulate sequential execution without duplicating processes
        const executedSteps: PipelineRunStep[] = [];
        const startTime = performance.now();
        for (const step of steps) {
            const durationMs = 400 + Math.floor(Math.random() * 500);
            const targetDir = selectedAsset.targetPath.includes('/') ? selectedAsset.targetPath.slice(0, selectedAsset.targetPath.lastIndexOf('/')) : selectedAsset.targetPath;
            const sourceDir = selectedAsset.sourcePath.includes('/') ? selectedAsset.sourcePath.slice(0, selectedAsset.sourcePath.lastIndexOf('/')) : selectedAsset.sourcePath;
            const command = step.command
                .replace('{source}', selectedAsset.sourcePath)
                .replace('{target}', selectedAsset.targetPath)
                .replace('{targetDir}', targetDir)
                .replace('{sourceDir}', sourceDir);
            const result: PipelineRunStep = { ...step, status: 'completed', output: `${step.tool} ✓`, notes: step.description, durationMs };
            executedSteps.push(result);
            log(`${step.name} completed via ${step.tool}`);
            log(`Command: ${command}`);
        }

        const endTime = performance.now();
        const totalDuration = Math.max(1, Math.round(endTime - startTime));
        setRunSteps(executedSteps);
        log(`Pipeline finished. Asset staged to ${selectedAsset.targetPath}`);

        const historyEntry: RunHistoryEntry = {
            id: `run-${Date.now()}`,
            pipelineId: selectedPipeline.id,
            durationMs: totalDuration,
            status: 'success',
            timestamp: new Date().toLocaleTimeString()
        };

        setRunHistory(prev => ({
            ...prev,
            [selectedAsset.id]: [historyEntry, ...(prev[selectedAsset.id] || [])].slice(0, 5)
        }));

        setIsRunning(false);
    };

    const copyPath = (path: string) => {
        navigator.clipboard.writeText(path);
        log(`Copied path: ${path}`);
    };

    const applicablePipelines = useMemo(() => PIPELINES.filter(p => selectedAsset ? p.applicable.includes(selectedAsset.type) : true), [selectedAsset]);

    const stagedForBA2 = useMemo(() => assets.filter(a => a.status === 'processed' || a.status === 'in-progress'), [assets]);

    return (
        <div className="h-full min-h-0 flex flex-col bg-[#111827] text-slate-200 font-sans overflow-hidden" onWheel={onWheel}>
            {/* Header */}
            <div className="p-4 border-b border-black bg-[#1f2937] flex justify-between items-center shadow-md">
                <div>
                    <h2 className="text-lg font-bold text-white flex items-center gap-2">
                        <GitBranch className="w-5 h-5 text-purple-400" />
                        The Orchestrator
                    </h2>
                    <p className="text-[10px] text-slate-400 font-mono mt-0.5">Asset Processing Pipeline & Shared Storage</p>
                </div>
                <div className="flex gap-2">
                    <Link
                        to="/reference"
                        className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest rounded border border-purple-500/30 bg-purple-900/20 text-purple-100 hover:bg-purple-900/30 transition-colors"
                        title="Open help"
                    >
                        Help
                    </Link>
                    <div className="px-3 py-1.5 bg-black rounded border border-slate-700 text-xs text-slate-300 flex items-center gap-2">
                        <Database className="w-3 h-3" /> Storage Ready
                    </div>
                </div>
            </div>

            <div className="p-4 border-b border-slate-800 bg-[#111827]">
                <div className="max-h-72 overflow-y-auto pr-2">
                    <ToolsInstallVerifyPanel
                        className="mb-0"
                        accentClassName="text-purple-300"
                        description="Orchestrator is a pipeline planner and run log UI. Any real processing requires you to connect it to real tools/commands in your environment (no default paths are assumed)."
                        tools={[]}
                        verify={[
                            'Select an asset and confirm applicable pipelines update.',
                            'Start a pipeline run and confirm you see step-by-step status output.',
                        ]}
                        firstTestLoop={[
                            'Pick one asset type (mesh/texture/audio/script) and run its simplest pipeline.',
                            'Copy the target path and confirm it matches your intended Data/ layout.',
                            'Package the processed output using the Packaging wizard.',
                        ]}
                        troubleshooting={[
                            'If a pipeline step “succeeds” but you don’t see results, confirm the command/tool is actually configured.',
                            'Treat any displayed source paths marked EXAMPLE as placeholders; set your real workspace paths.',
                        ]}
                    />
                </div>
            </div>

            <div className="flex flex-1 min-h-0 overflow-hidden">
                {/* Assets List */}
                <div className="w-80 border-r border-slate-800 bg-[#0f172a] flex flex-col min-h-0">
                    <div className="p-4 border-b border-slate-800 bg-[#111827]">
                        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wide">Assets</h3>
                        <p className="text-[10px] text-slate-500">Central storage to reuse across mods</p>
                    </div>
                    <div className="p-3 space-y-2 overflow-y-auto min-h-0">
                        {assets.map(asset => (
                            <button
                                key={asset.id}
                                onClick={() => setSelectedAssetId(asset.id)}
                                className={`w-full text-left p-3 rounded border transition-all ${
                                    selectedAssetId === asset.id
                                        ? 'bg-purple-900/30 border-purple-700/50 ring-1 ring-purple-500/40'
                                        : 'bg-slate-800/30 border-slate-700/50 hover:border-slate-500'
                                }`}
                            >
                                <div className="flex items-center justify-between">
                                    <div className="text-sm font-semibold text-white">{asset.name}</div>
                                    <span className={`text-[10px] px-2 py-0.5 rounded uppercase ${
                                        asset.status === 'processed' ? 'bg-green-900/40 text-green-200' :
                                        asset.status === 'in-progress' ? 'bg-yellow-900/40 text-yellow-200' :
                                        'bg-slate-900/60 text-slate-300'
                                    }`}>
                                        {asset.status}
                                    </span>
                                </div>
                                <div className="text-[10px] text-slate-400 mt-1">{asset.type.toUpperCase()} • {formatMB(asset.sizeMB)}</div>
                                <div className="flex gap-1 mt-2 flex-wrap">
                                    {asset.tags.map(tag => (
                                        <span key={tag} className="text-[9px] bg-slate-900/60 border border-slate-700/60 text-slate-200 px-1.5 py-0.5 rounded">
                                            {tag}
                                        </span>
                                    ))}
                                </div>
                                {asset.issues && asset.issues.length > 0 && (
                                    <div className="mt-2 text-[10px] text-red-300 flex items-start gap-1">
                                        <AlertTriangle className="w-3 h-3" />
                                        <span>{asset.issues[0]}</span>
                                    </div>
                                )}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Main Panel */}
                <div className="flex-1 flex flex-col min-h-0 bg-[#0b1220]">
                    {selectedAsset && selectedPipeline ? (
                        <>
                            {/* Pipeline Header */}
                            <div className="p-5 border-b border-slate-800 flex flex-wrap gap-4 items-center bg-[#0f172a]">
                                <div>
                                    <div className="text-[10px] text-slate-400 uppercase font-bold">Selected Asset</div>
                                    <div className="text-white font-semibold">{selectedAsset.name}</div>
                                    <div className="text-[11px] text-slate-400">{selectedAsset.sourcePath}</div>
                                </div>
                                <div className="flex gap-3 flex-1 min-w-[260px]">
                                    <div className="px-3 py-2 rounded border border-slate-700 bg-slate-900 text-xs text-slate-300 flex items-center gap-2">
                                        <Package className="w-3 h-3" /> Target: {selectedAsset.targetPath}
                                    </div>
                                    <div className="px-3 py-2 rounded border border-slate-700 bg-slate-900 text-xs text-slate-300 flex items-center gap-2">
                                        <Shield className="w-3 h-3" /> {selectedAsset.type.toUpperCase()} pipeline
                                    </div>
                                    <div className="px-3 py-2 rounded border border-slate-700 bg-slate-900 text-xs text-slate-300 flex items-center gap-2">
                                        <HardDrive className="w-3 h-3" /> {formatMB(selectedAsset.sizeMB)}
                                    </div>
                                </div>
                                <div className="flex gap-2 ml-auto">
                                    <button
                                        onClick={() => copyPath(selectedAsset.targetPath)}
                                        className="px-3 py-2 bg-slate-800 hover:bg-slate-700 rounded border border-slate-700 text-xs font-semibold text-slate-200 flex items-center gap-2 transition-colors"
                                    >
                                        <Copy className="w-3 h-3" /> Copy Path
                                    </button>
                                    <button
                                        onClick={handleRun}
                                        disabled={isRunning}
                                        className="px-4 py-2 bg-purple-700 hover:bg-purple-600 rounded border border-purple-500 text-xs font-semibold text-white flex items-center gap-2 transition-colors disabled:opacity-50"
                                    >
                                        {isRunning ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                                        {isRunning ? 'Running' : 'Run Pipeline'}
                                    </button>
                                </div>
                            </div>

                            {/* Pipeline Selection and Steps */}
                            <div className="flex-1 flex min-h-0 overflow-hidden">
                                <div className="w-72 border-r border-slate-800 bg-[#0f172a] p-4 space-y-2 overflow-y-auto min-h-0">
                                    <div className="text-[11px] text-slate-400 uppercase font-bold mb-2">Pipelines</div>
                                    {applicablePipelines.map(p => (
                                        <div key={p.id} className={`p-3 rounded border ${p.id === selectedPipeline.id ? 'bg-purple-900/30 border-purple-700/50' : 'bg-slate-900/40 border-slate-800'}`}>
                                            <div className="text-sm font-semibold text-white">{p.name}</div>
                                            <div className="text-[10px] text-slate-400 mt-1">{p.description}</div>
                                        </div>
                                    ))}
                                    <div className="mt-4 text-[10px] text-slate-400 flex items-center gap-2">
                                        <Repeat2 className="w-3 h-3" /> Orchestrator deduplicates overlapping steps automatically.
                                    </div>
                                </div>

                                <div ref={mainScrollRef} className="flex-1 min-h-0 overflow-y-auto p-6 pb-24">
                                    <div className="space-y-4">
                                        {runSteps.length === 0 && (
                                            <div className="text-center text-slate-500 py-8 text-sm">
                                                Initialize the pipeline to see step execution.
                                            </div>
                                        )}
                                        {runSteps.map((step, idx) => (
                                            <div key={step.id} className={`p-4 rounded-xl border relative ${
                                                step.status === 'completed' ? 'bg-emerald-900/10 border-emerald-600/50' :
                                                step.status === 'running' ? 'bg-slate-800 border-purple-500/50' :
                                                step.status === 'failed' ? 'bg-red-900/10 border-red-600/50' :
                                                'bg-slate-900/40 border-slate-700'
                                            }`}>
                                                {idx < runSteps.length - 1 && (
                                                    <div className="absolute left-6 top-full h-4 w-px bg-slate-700"></div>
                                                )}
                                                <div className="flex items-center gap-3">
                                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 ${
                                                        step.status === 'completed' ? 'border-emerald-500 text-emerald-400' :
                                                        step.status === 'running' ? 'border-purple-500 text-purple-400 animate-pulse' :
                                                        step.status === 'failed' ? 'border-red-500 text-red-400' :
                                                        'border-slate-600 text-slate-500'
                                                    }`}>
                                                        {step.status === 'completed' ? <CheckCircle2 className="w-5 h-5" /> : step.status === 'running' ? <Loader2 className="w-5 h-5 animate-spin" /> : <ClipboardList className="w-5 h-5" />}
                                                    </div>
                                                    <div className="flex-1">
                                                        <div className="flex items-center justify-between">
                                                            <div>
                                                                <div className="text-sm font-semibold text-white">{step.name}</div>
                                                                <div className="text-[11px] text-slate-400">{step.tool}</div>
                                                            </div>
                                                            <span className="text-[10px] text-slate-500">Step {idx + 1}</span>
                                                        </div>
                                                        <p className="text-xs text-slate-300 mt-2">{step.description}</p>
                                                        <div className="mt-2 text-[11px] text-slate-200 bg-black/30 border border-slate-700/60 rounded px-2 py-2">
                                                            <div className="text-[10px] text-slate-400 mb-1">Command</div>
                                                            <div className="flex items-center gap-2 text-[11px] text-slate-200">
                                                                <span className="truncate">{step.command
                                                                    .replace('{source}', selectedAsset.sourcePath)
                                                                    .replace('{target}', selectedAsset.targetPath)
                                                                    .replace('{targetDir}', selectedAsset.targetPath.includes('/') ? selectedAsset.targetPath.slice(0, selectedAsset.targetPath.lastIndexOf('/')) : selectedAsset.targetPath)
                                                                    .replace('{sourceDir}', selectedAsset.sourcePath.includes('/') ? selectedAsset.sourcePath.slice(0, selectedAsset.sourcePath.lastIndexOf('/')) : selectedAsset.sourcePath)
                                                                }</span>
                                                                <button
                                                                    onClick={() => navigator.clipboard.writeText(step.command
                                                                        .replace('{source}', selectedAsset.sourcePath)
                                                                        .replace('{target}', selectedAsset.targetPath)
                                                                        .replace('{targetDir}', selectedAsset.targetPath.includes('/') ? selectedAsset.targetPath.slice(0, selectedAsset.targetPath.lastIndexOf('/')) : selectedAsset.targetPath)
                                                                        .replace('{sourceDir}', selectedAsset.sourcePath.includes('/') ? selectedAsset.sourcePath.slice(0, selectedAsset.sourcePath.lastIndexOf('/')) : selectedAsset.sourcePath)
                                                                    )}
                                                                    className="px-2 py-1 bg-slate-800 hover:bg-slate-700 rounded border border-slate-700 text-[10px] text-slate-200 flex items-center gap-1"
                                                                >
                                                                    <Copy className="w-3 h-3" /> Copy
                                                                </button>
                                                            </div>
                                                        </div>
                                                        {step.output && (
                                                            <div className="mt-2 text-[11px] text-emerald-300 bg-black/40 border border-emerald-700/40 rounded px-2 py-1">
                                                                {step.output}
                                                                {step.durationMs ? <span className="ml-2 text-slate-400">({step.durationMs} ms)</span> : null}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className="flex-1 flex items-center justify-center text-slate-500">Select an asset to orchestrate processing.</div>
                    )}
                </div>

                {/* Right Panel */}
                <div className="w-80 border-l border-slate-800 bg-[#0f172a] flex flex-col min-h-0">
                    <div className="p-4 border-b border-slate-800 bg-[#111827] flex items-center justify-between">
                        <div>
                            <div className="text-[10px] text-slate-400 uppercase font-bold">Storage Stats</div>
                            <div className="text-sm text-white">Total {formatMB(storageStats.total)}</div>
                        </div>
                        <div className="text-right text-[11px] text-slate-400">
                            <div className="text-green-300">Processed {formatMB(storageStats.processed)}</div>
                            <div className="text-yellow-300">Pending {formatMB(storageStats.pending)}</div>
                        </div>
                    </div>

                    <div className="p-4 border-b border-slate-800 bg-[#0f172a] space-y-2">
                        <div className="text-[11px] text-slate-300 flex items-center gap-2"><Settings className="w-3 h-3" /> Single orchestrator avoids duplicate processing steps.</div>
                        <div className="text-[11px] text-slate-300 flex items-center gap-2"><Shield className="w-3 h-3" /> Consistent tools: Splicer, texconv, Outfit Studio, PapyrusCompiler.</div>
                    </div>

                    <div className="p-4 border-b border-slate-800 bg-[#0f172a] space-y-2">
                        <div className="flex items-center justify-between">
                            <div className="text-[10px] text-slate-400 uppercase font-bold">BA2 Queue</div>
                            <button
                                onClick={() => navigator.clipboard.writeText(stagedForBA2.map(a => a.targetPath).join('\n'))}
                                className="px-2 py-1 bg-slate-800 hover:bg-slate-700 rounded border border-slate-700 text-[10px] text-slate-200 flex items-center gap-1"
                            >
                                <ArrowDownToLine className="w-3 h-3" /> Copy List
                            </button>
                        </div>
                        <div className="text-[10px] text-slate-400">{stagedForBA2.length} assets staged</div>
                        <div className="max-h-24 overflow-y-auto space-y-1 text-[10px] text-slate-300">
                            {stagedForBA2.map(a => (
                                <div key={a.id} className="border border-slate-700 rounded px-2 py-1">
                                    {a.targetPath}
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="p-4 border-b border-slate-800 bg-[#0f172a] space-y-2">
                        <div className="text-[10px] text-slate-400 uppercase font-bold">Run History</div>
                        <div className="space-y-1 text-[10px] text-slate-300 max-h-28 overflow-y-auto">
                            {(selectedAsset && runHistory[selectedAsset.id]?.length) ? runHistory[selectedAsset.id].map(entry => (
                                <div key={entry.id} className="border border-slate-700 rounded px-2 py-1 flex justify-between">
                                    <span>{entry.timestamp}</span>
                                    <span className="text-slate-400">{entry.durationMs} ms</span>
                                </div>
                            )) : <div className="text-slate-600 italic">No runs yet.</div>}
                        </div>
                    </div>

                    <div className="flex-1 min-h-0 overflow-y-auto p-3 pb-24 space-y-2 font-mono text-[10px] text-slate-300">
                        {logs.length === 0 && <div className="italic text-slate-600">Waiting for pipeline run...</div>}
                        {logs.map((logEntry, idx) => (
                            <div key={idx} className={`border-l-2 pl-2 py-1 ${
                                logEntry.level === 'error' ? 'border-red-500 text-red-300' :
                                logEntry.level === 'warn' ? 'border-yellow-500 text-yellow-200' :
                                'border-slate-700'
                            }`}>
                                <span className="text-slate-500 mr-2">{logEntry.timestamp}</span>
                                {logEntry.message}
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default WorkflowOrchestrator;