import React, { useEffect, useRef, useState } from 'react';
import { Container, Search, HardDrive, Lock, Globe, ShieldCheck, Clipboard, CheckCircle2, AlertTriangle, Archive, FilePlus, Upload, Wrench } from 'lucide-react';

type AssetType = 'mesh' | 'texture' | 'audio' | 'script' | 'ui';

interface Asset {
    id: string;
    name: string;
    type: AssetType;
    sourcePath: string;
    targetPath: string;
    size: string;
    privacy: 'local' | 'shared';
    tags: string[];
    staged: boolean;
    lastVerified: string;
    issues: string[];
    lastRun?: string;
    expectedFormat?: 'AUTO' | 'BC1' | 'BC3' | 'BC5';
}

const initialAssets: Asset[] = [
    {
        id: 'mesh-railgun',
        name: 'Railgun Receiver',
        type: 'mesh',
        sourcePath: 'D:/FO4/Assets/Meshes/Railgun/railgun_receiver.fbx',
        targetPath: 'Data/Meshes/Weapons/Railgun/railgun_receiver.nif',
        size: '6.4 MB',
        privacy: 'local',
        tags: ['mesh', 'weapon', 'collision'],
        staged: false,
        lastVerified: 'Not run',
        issues: ['Missing bhkCollision', 'Normals need recalculation'],
        lastRun: ''
    },
    {
        id: 'tex-marine',
        name: 'Marine Armor Albedo',
        type: 'texture',
        sourcePath: 'D:/FO4/Textures/Armor/Marine/marine_d.png',
        targetPath: 'Data/Textures/Armor/Marine/marine_d.dds',
        size: '8.1 MB',
        privacy: 'shared',
        tags: ['texture', 'albedo', '2k'],
        staged: true,
        lastVerified: '2024-05-01 10:15',
        issues: [],
        lastRun: 'texconv OK: BC1 / mipmaps generated'
    },
    {
        id: 'audio-vox',
        name: 'Companion VOX Line 04',
        type: 'audio',
        sourcePath: 'D:/FO4/Audio/Companion/line04.wav',
        targetPath: 'Data/Sound/Voice/MyCompanion.esp/Line04.xwm',
        size: '1.4 MB',
        privacy: 'local',
        tags: ['voice', 'dialogue', 'xwm'],
        staged: true,
        lastVerified: '2024-04-28 08:40',
        issues: ['LUFS above -16, normalize before encode'],
        lastRun: 'xWMAEncode warning: input hotter than -16 LUFS'
    },
    {
        id: 'script-quest',
        name: 'MQ204 Scene Controller',
        type: 'script',
        sourcePath: 'D:/FO4/Scripts/MQ204/MQ204SceneController.psc',
        targetPath: 'Data/Scripts/MQ204SceneController.pex',
        size: '12 KB',
        privacy: 'shared',
        tags: ['papyrus', 'quest', 'pex'],
        staged: false,
        lastVerified: 'Not run',
        issues: ['Missing import: F4SE', 'Compile path not set'],
        lastRun: ''
    },
    {
        id: 'ui-pipboy',
        name: 'Pip-Boy Overlay',
        type: 'ui',
        sourcePath: 'D:/FO4/UI/Overlays/pipboy_overlay.psd',
        targetPath: 'Data/Interface/pipboy_overlay.swf',
        size: '3.2 MB',
        privacy: 'local',
        tags: ['ui', 'flash', 'interface'],
        staged: false,
        lastVerified: '2024-04-30 12:00',
        issues: ['Export to SWF pending'],
        lastRun: ''
    }
];

const TheVault: React.FC = () => {
    const [assets, setAssets] = useState<Asset[]>(() => {
        const stored = typeof window !== 'undefined' ? window.localStorage.getItem('vault-assets-v1') : null;
        if (!stored) return initialAssets;
        try {
            const parsed = JSON.parse(stored) as Asset[];
            return parsed.length ? parsed : initialAssets;
        } catch {
            return initialAssets;
        }
    });
    const [searchTerm, setSearchTerm] = useState('');
    const [filterType, setFilterType] = useState<'all' | AssetType>('all');
    const [privacyFilter, setPrivacyFilter] = useState<'all' | 'local' | 'shared'>('all');
    const [statusFilter, setStatusFilter] = useState<'all' | 'ready' | 'issues'>('all');
    const [onlyStaged, setOnlyStaged] = useState(false);
    const [verifyingIds, setVerifyingIds] = useState<Set<string>>(new Set());
    const fileInputRef = useRef<HTMLInputElement | null>(null);
    const [allowOversizedTextures, setAllowOversizedTextures] = useState(false);
    const api = (window as any).electron?.api;

    type ToolPaths = Partial<Record<'texconv' | 'xWMAEncode' | 'PapyrusCompiler' | 'gfxexport' | 'splicer', string>>;
    const [toolPaths, setToolPaths] = useState<ToolPaths>(() => {
        try { return JSON.parse(localStorage.getItem('vault-tool-paths-v1') || '{}') as ToolPaths; } catch { return {}; }
    });
    const [toolVersions, setToolVersions] = useState<Partial<Record<keyof ToolPaths, string>>>({});

    type ToolExtraArgs = Partial<Record<keyof ToolPaths, string>>;
    const [toolExtraArgs, setToolExtraArgs] = useState<ToolExtraArgs>(() => {
        try { return JSON.parse(localStorage.getItem('vault-tool-extra-args-v1') || '{}') as ToolExtraArgs; } catch { return {}; }
    });

    type VaultPresets = {
        meshesBase: string;
        texturesBase: string;
        audioBase: string;
        voiceProject: string;
        scriptsBase: string;
        scriptsSource: string;
        uiBase: string;
    };
    const [presets, setPresets] = useState<VaultPresets>(() => {
        const raw = typeof window !== 'undefined' ? window.localStorage.getItem('vault-presets-v1') : null;
        if (raw) {
            try { return JSON.parse(raw) as VaultPresets; } catch {}
        }
        return {
            meshesBase: 'Data/Meshes',
            texturesBase: 'Data/Textures',
            audioBase: 'Data/Sound/Voice',
            voiceProject: 'MyCompanion.esp',
            scriptsBase: 'Data/Scripts',
            scriptsSource: 'Data/Scripts/Source',
            uiBase: 'Data/Interface',
        };
    });
    const [autoConvertImagesToDDS, setAutoConvertImagesToDDS] = useState<boolean>(() => {
        try { return JSON.parse(localStorage.getItem('vault-auto-convert-images-v1') || 'false'); } catch { return false; }
    });

    const toolMap: Record<AssetType, { tool: string; command: string; patterns: string[] }> = {
        mesh: {
            tool: 'Splicer + OutfitStudio',
            command: 'splicer validate --recalc-normals --rebuild-collision "{source}" -o "{target}"',
            patterns: ['collision', 'normal', 'bhk']
        },
        texture: {
            tool: 'texconv',
            command: 'texconv -f <fmt> -o "Data/Textures" "{source}"',
            patterns: ['bc', 'compression', 'dds', 'mipmap']
        },
        audio: {
            tool: 'xWMAEncode',
            command: 'xWMAEncode "{source}" "{target}" --bitrate 192k',
            patterns: ['lufs', 'normalize', 'xwm']
        },
        script: {
            tool: 'PapyrusCompiler',
            command: 'PapyrusCompiler "{source}" -f="Institute_Papyrus_Flags.flg" -i="Data/Scripts/Source" -o="Data/Scripts"',
            patterns: ['import', 'compile', 'pex']
        },
        ui: {
            tool: 'Scaleform Export',
            command: 'gfxexport "{source}" -o "{target}"',
            patterns: ['swf', 'export', 'interface']
        }
    };

    const guessType = (filename: string): AssetType => {
        const ext = filename.toLowerCase().split('.').pop() || '';
        if (['nif', 'fbx', 'obj'].includes(ext)) return 'mesh';
        if (['dds', 'png', 'tga', 'jpg', 'jpeg'].includes(ext)) return 'texture';
        if (['wav', 'mp3', 'ogg', 'xwm'].includes(ext)) return 'audio';
        if (['psc', 'pex'].includes(ext)) return 'script';
        if (['swf', 'psd', 'ai', 'fla'].includes(ext)) return 'ui';
        return 'mesh';
    };

    const targetFor = (type: AssetType, filename: string) => {
        const base = filename.replace(/\\/g, '/').split('/').pop() || filename;
        const stem = base.includes('.') ? base.slice(0, base.lastIndexOf('.')) : base;
        if (type === 'mesh') return `${presets.meshesBase}/${stem}.nif`;
        if (type === 'texture') return `${presets.texturesBase}/${stem}.dds`;
        if (type === 'audio') return `${presets.audioBase}/${presets.voiceProject}/${stem}.xwm`;
        if (type === 'script') return `${presets.scriptsBase}/${stem}.pex`;
        return `${presets.uiBase}/${stem}.swf`;
    };

    const parseArgs = (line: string): string[] => {
        if (!line) return [];
        const out: string[] = [];
        let cur = '';
        let q: '"' | "'" | null = null;
        for (let i = 0; i < line.length; i++) {
            const ch = line[i];
            if (q) {
                if (ch === q) { q = null; }
                else { cur += ch; }
            } else {
                if (ch === '"' || ch === "'") { q = ch as '"' | "'"; }
                else if (ch === ' ') { if (cur) { out.push(cur); cur = ''; } }
                else { cur += ch; }
            }
        }
        if (cur) out.push(cur);
        return out;
    };

    const expectedTexFormatFor = (asset: Asset): 'BC1_UNORM' | 'BC3_UNORM' | 'BC5_UNORM' => {
        const explicit = asset.expectedFormat;
        const name = (asset.name || '').toLowerCase();
        const tags = (asset.tags || []).map(t => t.toLowerCase());
        if (explicit && explicit !== 'AUTO') {
            if (explicit === 'BC1') return 'BC1_UNORM';
            if (explicit === 'BC3') return 'BC3_UNORM';
            return 'BC5_UNORM';
        }
        if (tags.includes('normal') || /(^|[_-])n($|\b)/.test(name) || name.includes('_n.')) return 'BC5_UNORM';
        if (tags.includes('alpha') || name.includes('alpha')) return 'BC3_UNORM';
        if (tags.includes('albedo') || /(^|[_-])d($|\b)/.test(name) || name.includes('_d.')) return 'BC1_UNORM';
        return 'BC1_UNORM';
    };

    const formatSize = (bytes: number) => {
        if (!bytes || Number.isNaN(bytes)) return '0 MB';
        const mb = bytes / (1024 * 1024);
        return `${mb.toFixed(1)} MB`;
    };

    const runTool = async (asset: Asset) => {
        const meta = toolMap[asset.type];
        const cmdKey = meta.tool === 'Splicer + OutfitStudio' ? 'splicer' : (meta.tool as keyof ToolPaths);
        const cmd = (toolPaths[cmdKey] || cmdKey) as string;
        
        // Check if tool path is configured
        if (!toolPaths[cmdKey]) {
            const errorMsg = `Tool "${cmdKey}" not configured. Please set the tool path in the configuration panel below.`;
            console.warn('[TheVault]', errorMsg);
            return { 
                remaining: asset.issues, 
                log: `❌ ${errorMsg}\n\n💡 Tip: Scroll down to "Tool Paths & Configuration" and click "Browse" to select ${cmdKey}.exe`, 
                exitCode: -1 
            };
        }
        
        // Build args per type
        let args: string[] = [];
        if (asset.type === 'mesh') {
            args = ['validate', '--recalc-normals', '--rebuild-collision', asset.sourcePath, '-o', asset.targetPath];
        } else if (asset.type === 'texture') {
            const fmt = expectedTexFormatFor(asset);
            const ext = (asset.sourcePath.split('.').pop() || '').toLowerCase();
            const isImage = ['png','tga','targa','jpg','jpeg'].includes(ext);
            const isDDS = ext === 'dds';
            if (isImage && !autoConvertImagesToDDS) {
                // Skip conversion when disabled; rely on dimension guard and leave compression validation pending
                const note = `Auto-convert disabled for images; expected ${fmt.replace('_UNORM','')} when converted.`;
                const filtered = asset.issues.filter(i => !/unexpected bc format/i.test(i));
                return { remaining: filtered, log: note, exitCode: 0 };
            }
            args = ['-nologo', '-y', '-f', fmt, '-o', presets.texturesBase];
            args.push(asset.sourcePath);
        } else if (asset.type === 'audio') {
            args = [asset.sourcePath, asset.targetPath, '--bitrate', '192k'];
        } else if (asset.type === 'script') {
            args = [asset.sourcePath, `-f=${pathLike('Institute_Papyrus_Flags.flg')}`, `-i=${presets.scriptsSource}`, `-o=${presets.scriptsBase}`];
        } else if (asset.type === 'ui') {
            args = [asset.sourcePath, '-o', asset.targetPath];
        }

        // Append custom CLI args if provided for this tool
        const extra = (toolExtraArgs as any)[cmdKey] as string | undefined;
        if (extra && extra.trim().length) {
            args = [...args, ...parseArgs(extra.trim())];
        }

        const header = `${meta.tool} -> ${meta.command.replace('{source}', asset.sourcePath).replace('{target}', asset.targetPath)}`;
        let stdout = '';
        let stderr = '';
        let exitCode = -1;
        const api = (window as any).electron?.api;
        if (api?.runTool) {
            try {
                const result = await api.runTool({ cmd, args });
                stdout = result.stdout || '';
                stderr = result.stderr || '';
                exitCode = result.exitCode;
            } catch (e: any) {
                // Better error handling for spawn failures
                if (e?.message?.includes('ENOENT') || e?.toString()?.includes('ENOENT')) {
                    stderr = `❌ Tool executable not found: "${cmd}"\n\n` +
                             `The file path appears to be incorrect or the tool is not installed.\n\n` +
                             `💡 Please check:\n` +
                             `1. The tool path is correct (use Browse button)\n` +
                             `2. The .exe file exists at that location\n` +
                             `3. You have permission to run the executable`;
                } else {
                    stderr = `Error running tool: ${String(e)}`;
                }
                exitCode = -1;
            }
        } else {
            stdout = '⚠️ Desktop Bridge not available - tool execution requires Electron app.\n\n' +
                     'Running in web-only mode. To use external tools, please run the Electron desktop app.';
            exitCode = 0;
        }
        const output = [header, stdout, stderr].filter(Boolean).join('\n');
        // Resolve issues if the output references any of the patterns
        const remaining: string[] = [];
        const lower = output.toLowerCase();
        asset.issues.forEach(issue => {
            const found = toolMap[asset.type].patterns.some(p => lower.includes(p));
            if (!found) remaining.push(issue);
        });
        if (asset.type === 'texture') {
            // Detect actual format from output
            const actualMatch = output.match(/\bBC(1|3|5)\b/i);
            const expected = expectedTexFormatFor(asset);
            if (actualMatch) {
                const actual = `BC${actualMatch[1]}_UNORM`;
                if (actual.toUpperCase() === expected.toUpperCase()) {
                    // Clear compression issues
                    const filtered = remaining.filter(i => !/compression not validated/i.test(i) && !/unexpected bc format/i.test(i));
                    remaining.splice(0, remaining.length, ...filtered);
                } else {
                    // Add/keep mismatch issue
                    const issue = `Unexpected BC format: expected ${expected.replace('_UNORM','')}, got ${actual.replace('_UNORM','')}`;
                    if (!remaining.some(i => i.toLowerCase().includes('unexpected bc format'))) remaining.push(issue);
                }
            } else {
                // If texconv ran but didn't indicate BC, keep validation issue
                if (!remaining.some(i => /compression not validated/i.test(i))) remaining.push('Compression not validated');
            }
        }
        return { remaining, log: output, exitCode };
    };

    const pathLike = (s: string) => s; // simple helper for readability

    const addAssetsFromFileList = (fileList: FileList | null) => {
        if (!fileList || fileList.length === 0) return;
        const incoming: Asset[] = [];
        Array.from(fileList).forEach(file => {
            const type = guessType(file.name);
            incoming.push({
                id: `${type}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
                name: file.name,
                type,
                sourcePath: (file as any).path || file.name,
                targetPath: targetFor(type, file.name),
                size: formatSize(file.size),
                privacy: 'local',
                tags: [type],
                staged: false,
                lastVerified: 'Not run',
                issues: type === 'texture' ? ['Compression not validated'] : type === 'audio' ? ['Normalize to -16 LUFS before encode'] : type === 'script' ? ['Compile path not set'] : type === 'ui' ? ['Export to SWF pending'] : ['Collision not validated'],
                lastRun: ''
            });
        });
        setAssets(prev => [...incoming, ...prev]);
    };

    useEffect(() => {
        if (typeof window === 'undefined') return;
        window.localStorage.setItem('vault-assets-v1', JSON.stringify(assets));
        const api = (window as any).electron?.api;
        api?.saveVaultManifest?.(assets).catch(() => {});
    }, [assets]);

    useEffect(() => {
        if (typeof window === 'undefined') return;
        window.localStorage.setItem('vault-presets-v1', JSON.stringify(presets));
    }, [presets]);

    useEffect(() => {
        localStorage.setItem('vault-tool-paths-v1', JSON.stringify(toolPaths));
        (async () => {
            if (!api?.getToolVersion) return;
            const entries = Object.entries(toolPaths) as [keyof ToolPaths, string][];
            const versions: Partial<Record<keyof ToolPaths, string>> = {};
            for (const [k, p] of entries) {
                if (p) {
                    try { versions[k] = await api.getToolVersion(p); } catch { versions[k] = ''; }
                }
            }
            setToolVersions(versions);
        })();
    }, [toolPaths]);

    useEffect(() => {
        localStorage.setItem('vault-tool-extra-args-v1', JSON.stringify(toolExtraArgs));
    }, [toolExtraArgs]);

    useEffect(() => {
        localStorage.setItem('vault-auto-convert-images-v1', JSON.stringify(autoConvertImagesToDDS));
    }, [autoConvertImagesToDDS]);

    useEffect(() => {
        const api = (window as any).electron?.api;
        api?.loadVaultManifest?.().then((data: any) => {
            if (Array.isArray(data) && data.length) setAssets(data);
        }).catch(() => {});
    }, []);

    const filteredAssets = assets.filter(asset => {
        const search = searchTerm.toLowerCase();
        const matchesSearch = asset.name.toLowerCase().includes(search) || asset.tags.some(tag => tag.toLowerCase().includes(search));
        const matchesType = filterType === 'all' || asset.type === filterType;
        const matchesPrivacy = privacyFilter === 'all' || asset.privacy === privacyFilter;
        const hasIssues = asset.issues.length > 0;
        const matchesStatus = statusFilter === 'all' || (statusFilter === 'issues' ? hasIssues : !hasIssues);
        const matchesStaged = onlyStaged ? asset.staged : true;
        return matchesSearch && matchesType && matchesPrivacy && matchesStatus && matchesStaged;
    });

    const stagedAssets = assets.filter(a => a.staged);
    const issuesCount = assets.filter(a => a.issues.length > 0).length;
    const readyCount = assets.length - issuesCount;
    const totalSize = assets.reduce((acc, curr) => acc + parseFloat(curr.size), 0);

    const togglePrivacy = (id: string) => {
        setAssets(prev => prev.map(a => a.id === id ? { ...a, privacy: a.privacy === 'local' ? 'shared' : 'local' } : a));
    };

    const toggleStage = (id: string) => {
        setAssets(prev => prev.map(a => {
            if (a.id !== id) return a;
            if (a.issues.length > 0) return a;
            if (a.type === 'texture' && !allowOversizedTextures) {
                const ext = (a.sourcePath.split('.').pop() || '').toLowerCase();
                if (ext === 'dds') {
                    // Defer to async check, keep state unchanged synchronously
                    (async () => {
                        try {
                            const dims = await (window as any).electron?.api?.getDdsDimensions?.(a.sourcePath);
                            if (dims && (dims.width > 4096 || dims.height > 4096)) {
                                setAssets(p => p.map(x => x.id === a.id ? { ...x, issues: Array.from(new Set([...(x.issues||[]), 'Texture exceeds 4K'])) } : x));
                            } else {
                                setAssets(p => p.map(x => x.id === a.id ? { ...x, staged: !x.staged } : x));
                            }
                        } catch {
                            // If check fails, do nothing
                        }
                    })();
                    return a;
                } else if (ext === 'png' || ext === 'tga' || ext === 'targa' || ext === 'jpg' || ext === 'jpeg') {
                    (async () => {
                        try {
                            const dims = await (window as any).electron?.api?.getImageDimensions?.(a.sourcePath);
                            if (dims && (dims.width > 4096 || dims.height > 4096)) {
                                setAssets(p => p.map(x => x.id === a.id ? { ...x, issues: Array.from(new Set([...(x.issues||[]), 'Texture exceeds 4K'])) } : x));
                            } else {
                                setAssets(p => p.map(x => x.id === a.id ? { ...x, staged: !x.staged } : x));
                            }
                        } catch {}
                    })();
                    return a;
                }
            }
            return { ...a, staged: !a.staged };
        }));
    };

    const handleVerify = (asset: Asset) => {
        setVerifyingIds(prev => new Set(prev).add(asset.id));
        (async () => {
            const { remaining, log } = await runTool(asset);
            setAssets(prev => prev.map(a => {
                if (a.id !== asset.id) return a;
                return {
                    ...a,
                    issues: remaining,
                    lastVerified: new Date().toISOString().slice(0, 16).replace('T', ' '),
                    lastRun: log,
                    staged: remaining.length === 0 ? a.staged : false
                };
            }));
            setVerifyingIds(prev => {
                const next = new Set(prev);
                next.delete(asset.id);
                return next;
            });
        })();
    };

    const handleVerifyAll = () => {
        assets.forEach(asset => handleVerify(asset));
    };

    const handleCopy = (value: string) => {
        if (!value) return;
        navigator.clipboard?.writeText(value).catch(() => {});
    };

    const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        addAssetsFromFileList(e.dataTransfer.files);
    };

    const handleBrowse = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        addAssetsFromFileList(e.target.files);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const manifest = stagedAssets
        .map(a => `${a.targetPath}`)
        .join('\n');

    return (
        <div className="h-full flex flex-col bg-forge-dark text-slate-200">
            <div className="p-6 border-b border-slate-700 bg-forge-panel flex flex-col gap-4 shadow-md z-10">
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-2xl font-bold text-white flex items-center gap-3">
                            <Container className="w-6 h-6 text-forge-accent" />
                            The Vault
                        </h1>
                        <p className="text-xs text-slate-400 font-mono mt-1">Secure Fallout 4 Asset Library & BA2 staging</p>
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={handleVerifyAll}
                            className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-600 rounded-lg text-sm font-bold transition-colors"
                        >
                            <CheckCircle2 className="w-4 h-4" />
                            Verify All
                        </button>
                        <button
                            onClick={() => handleCopy(manifest)}
                            disabled={stagedAssets.length === 0}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-colors border ${
                                stagedAssets.length === 0
                                    ? 'bg-slate-800 border-slate-700 text-slate-500 cursor-not-allowed'
                                    : 'bg-forge-accent text-slate-900 border-slate-200 shadow-[0_0_15px_rgba(56,189,248,0.3)] hover:bg-sky-400'
                            }`}
                        >
                            <Archive className="w-4 h-4" />
                            Copy BA2 Manifest
                        </button>
                    </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
                        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3">
                            <div className="text-xs text-slate-400 mb-2 font-semibold">Auto-target Presets</div>
                                        <div className="grid grid-cols-2 gap-2 text-xs">
                                <label className="flex flex-col gap-1">
                                    <span className="text-slate-500">Meshes</span>
                                    <input value={presets.meshesBase} onChange={e=>setPresets(p=>({...p, meshesBase:e.target.value}))} className="bg-slate-950 border border-slate-800 rounded px-2 py-1 text-slate-200" />
                                </label>
                                <label className="flex flex-col gap-1">
                                    <span className="text-slate-500">Textures</span>
                                    <input value={presets.texturesBase} onChange={e=>setPresets(p=>({...p, texturesBase:e.target.value}))} className="bg-slate-950 border border-slate-800 rounded px-2 py-1 text-slate-200" />
                                </label>
                                <label className="flex flex-col gap-1">
                                    <span className="text-slate-500">Audio Base</span>
                                    <input value={presets.audioBase} onChange={e=>setPresets(p=>({...p, audioBase:e.target.value}))} className="bg-slate-950 border border-slate-800 rounded px-2 py-1 text-slate-200" />
                                </label>
                                <label className="flex flex-col gap-1">
                                    <span className="text-slate-500">Voice Project</span>
                                    <input value={presets.voiceProject} onChange={e=>setPresets(p=>({...p, voiceProject:e.target.value}))} className="bg-slate-950 border border-slate-800 rounded px-2 py-1 text-slate-200" />
                                </label>
                                <label className="flex flex-col gap-1">
                                    <span className="text-slate-500">Scripts Out</span>
                                    <input value={presets.scriptsBase} onChange={e=>setPresets(p=>({...p, scriptsBase:e.target.value}))} className="bg-slate-950 border border-slate-800 rounded px-2 py-1 text-slate-200" />
                                </label>
                                <label className="flex flex-col gap-1">
                                    <span className="text-slate-500">Scripts Source</span>
                                    <input value={presets.scriptsSource} onChange={e=>setPresets(p=>({...p, scriptsSource:e.target.value}))} className="bg-slate-950 border border-slate-800 rounded px-2 py-1 text-slate-200" />
                                </label>
                                <label className="flex flex-col gap-1">
                                    <span className="text-slate-500">UI</span>
                                    <input value={presets.uiBase} onChange={e=>setPresets(p=>({...p, uiBase:e.target.value}))} className="bg-slate-950 border border-slate-800 rounded px-2 py-1 text-slate-200" />
                                </label>
                                <label className="flex items-center gap-2 mt-5">
                                    <input type="checkbox" className="accent-forge-accent" checked={allowOversizedTextures} onChange={e=>setAllowOversizedTextures(e.target.checked)} />
                                    <span className="text-slate-400">Allow &gt;4K textures</span>
                                </label>
                                            <label className="flex items-center gap-2 mt-2">
                                                <input type="checkbox" className="accent-forge-accent" checked={autoConvertImagesToDDS} onChange={e=>setAutoConvertImagesToDDS(e.target.checked)} />
                                                <span className="text-slate-400">Auto-convert PNG/TGA/JPG to DDS</span>
                                            </label>
                            </div>
                                            <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3">
                                                <div className="flex items-center gap-2 text-xs text-slate-400 mb-2 font-semibold"><Wrench className="w-4 h-4"/> Tool Paths</div>
                                                <div className="grid grid-cols-2 gap-2 text-xs">
                                                    {(['texconv','xWMAEncode','PapyrusCompiler','gfxexport','splicer'] as const).map(key => (
                                                        <div key={key} className="col-span-2">
                                                            <div className="flex items-center gap-2 mb-1">
                                                                <span className="w-32 text-slate-500 capitalize">{key}</span>
                                                                <input value={(toolPaths as any)[key] || ''} onChange={e=>setToolPaths(p=>({...p, [key]: e.target.value}))} className="flex-1 bg-slate-950 border border-slate-800 rounded px-2 py-1 text-slate-200" placeholder={`Path to ${key}.exe`} />
                                                                <button onClick={async()=>{ const p = await api?.pickToolPath?.(key); if(p) setToolPaths(tp=>({...tp, [key]: p})); }} className="px-2 py-1 border border-slate-700 rounded hover:border-forge-accent">Browse</button>
                                                                <span className="text-[10px] text-slate-500 w-24 truncate" title={(toolVersions as any)[key] || ''}>{(toolVersions as any)[key] || ''}</span>
                                                            </div>
                                                            <div className="flex items-center gap-2">
                                                                <span className="w-32 text-slate-500">Extra args</span>
                                                                <input value={(toolExtraArgs as any)[key] || ''} onChange={e=>setToolExtraArgs(p=>({...p, [key]: e.target.value}))} className="flex-1 bg-slate-950 border border-slate-800 rounded px-2 py-1 text-slate-200" placeholder="Optional CLI args appended for advanced runs" />
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex flex-wrap gap-4">
                    <div className="flex-1 min-w-[220px] relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                        <input
                            type="text"
                            placeholder="Search assets, tags, or paths"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-10 pr-4 py-2 text-sm focus:outline-none focus:border-forge-accent text-slate-200"
                        />
                    </div>
                    <select
                        value={filterType}
                        onChange={(e) => setFilterType(e.target.value as 'all' | AssetType)}
                        className="bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-forge-accent"
                    >
                        <option value="all">All Types</option>
                        <option value="mesh">Meshes</option>
                        <option value="texture">Textures</option>
                        <option value="audio">Audio</option>
                        <option value="script">Scripts</option>
                        <option value="ui">UI</option>
                    </select>
                    <div className="flex bg-slate-900 rounded-lg p-1 border border-slate-700">
                        <button
                            onClick={() => setPrivacyFilter('all')}
                            className={`px-3 py-1 text-xs rounded font-medium transition-colors ${privacyFilter === 'all' ? 'bg-slate-700 text-white' : 'text-slate-500 hover:text-slate-300'}`}
                        >
                            All
                        </button>
                        <button
                            onClick={() => setPrivacyFilter('local')}
                            className={`px-3 py-1 text-xs rounded font-medium flex items-center gap-1 transition-colors ${privacyFilter === 'local' ? 'bg-red-900/50 text-red-200' : 'text-slate-500 hover:text-red-400'}`}
                        >
                            <Lock className="w-3 h-3" /> Local
                        </button>
                        <button
                            onClick={() => setPrivacyFilter('shared')}
                            className={`px-3 py-1 text-xs rounded font-medium flex items-center gap-1 transition-colors ${privacyFilter === 'shared' ? 'bg-blue-900/50 text-blue-200' : 'text-slate-500 hover:text-blue-400'}`}
                        >
                            <Globe className="w-3 h-3" /> Shared
                        </button>
                    </div>
                    <div className="flex bg-slate-900 rounded-lg p-1 border border-slate-700">
                        <button
                            onClick={() => setStatusFilter('all')}
                            className={`px-3 py-1 text-xs rounded font-medium transition-colors ${statusFilter === 'all' ? 'bg-slate-700 text-white' : 'text-slate-500 hover:text-slate-300'}`}
                        >
                            Any Status
                        </button>
                        <button
                            onClick={() => setStatusFilter('ready')}
                            className={`px-3 py-1 text-xs rounded font-medium transition-colors ${statusFilter === 'ready' ? 'bg-emerald-900/40 text-emerald-200' : 'text-slate-500 hover:text-emerald-300'}`}
                        >
                            Ready
                        </button>
                        <button
                            onClick={() => setStatusFilter('issues')}
                            className={`px-3 py-1 text-xs rounded font-medium transition-colors ${statusFilter === 'issues' ? 'bg-amber-900/40 text-amber-200' : 'text-slate-500 hover:text-amber-300'}`}
                        >
                            Needs Fix
                        </button>
                    </div>
                    <label className="flex items-center gap-2 text-xs text-slate-400 bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 cursor-pointer">
                        <input type="checkbox" checked={onlyStaged} onChange={(e) => setOnlyStaged(e.target.checked)} className="accent-forge-accent" />
                        Show only staged
                    </label>
                </div>

                {/* Tool Configuration Warning */}
                {Object.keys(toolPaths).length === 0 && (
                    <div className="bg-amber-900/20 border border-amber-700/50 rounded-lg p-3 flex items-start gap-3">
                        <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
                        <div className="flex-1 text-sm">
                            <div className="font-semibold text-amber-200 mb-1">External Tools Not Configured</div>
                            <div className="text-amber-300/80 text-xs">
                                Asset verification requires external tools (texconv, splicer, etc.). 
                                Scroll down to <span className="font-semibold">"Tool Paths & Configuration"</span> to set up your tools.
                            </div>
                        </div>
                    </div>
                )}

                <div
                    onDrop={handleDrop}
                    onDragOver={(e) => e.preventDefault()}
                    className="mt-4 border border-dashed border-slate-600 bg-slate-900/60 rounded-xl p-4 flex items-center justify-between gap-3"
                >
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-slate-800 border border-slate-700">
                            <Upload className="w-5 h-5 text-forge-accent" />
                        </div>
                        <div>
                            <p className="text-sm font-semibold text-white">Drop assets or import files</p>
                            <p className="text-xs text-slate-400">We auto-assign Data/ targets per type (mesh, texture, audio, script, UI).</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={handleBrowse}
                            className="flex items-center gap-2 px-3 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-600 rounded-lg text-xs font-bold transition-colors"
                        >
                            <FilePlus className="w-4 h-4" />
                            Import files
                        </button>
                        <input
                            ref={fileInputRef}
                            type="file"
                            multiple
                            className="hidden"
                            onChange={handleFileChange}
                        />
                    </div>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 bg-[#0c1220]">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
                    <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-3">
                        <p className="text-[10px] uppercase text-slate-500">Tracked assets</p>
                        <p className="text-xl font-bold text-white">{assets.length}</p>
                    </div>
                    <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-3">
                        <p className="text-[10px] uppercase text-slate-500">Staged for BA2</p>
                        <p className="text-xl font-bold text-white">{stagedAssets.length}</p>
                    </div>
                    <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-3">
                        <p className="text-[10px] uppercase text-slate-500">Ready</p>
                        <p className="text-xl font-bold text-emerald-400">{readyCount}</p>
                    </div>
                    <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-3">
                        <p className="text-[10px] uppercase text-slate-500">With issues</p>
                        <p className="text-xl font-bold text-amber-400">{issuesCount}</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
                    <div className="lg:col-span-2 bg-slate-900/60 border border-slate-800 rounded-xl p-4">
                        <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                                <Archive className="w-4 h-4 text-forge-accent" />
                                <span className="text-sm font-semibold text-white">Staged BA2 manifest</span>
                            </div>
                            <button
                                onClick={() => handleCopy(manifest)}
                                disabled={stagedAssets.length === 0}
                                className={`flex items-center gap-2 px-3 py-1 text-xs rounded border ${
                                    stagedAssets.length === 0
                                        ? 'border-slate-700 text-slate-500 cursor-not-allowed'
                                        : 'border-slate-600 text-forge-accent hover:border-forge-accent'
                                }`}
                            >
                                <Clipboard className="w-3 h-3" /> Copy list
                            </button>
                        </div>
                        <div className="bg-slate-950/60 border border-slate-800 rounded p-3 h-32 overflow-y-auto text-xs text-slate-300 font-mono">
                            {stagedAssets.length === 0 ? (
                                <p className="text-slate-600">Nothing staged yet. Stage assets to generate an Archive2 list.</p>
                            ) : (
                                stagedAssets.map(asset => (
                                    <div key={asset.id} className="flex items-center justify-between py-1 border-b border-slate-800 last:border-b-0">
                                        <span className="truncate pr-2">{asset.targetPath}</span>
                                        <span className="text-[10px] text-slate-500 uppercase">{asset.type}</span>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 flex flex-col gap-3">
                        <div className="flex items-center gap-2 text-sm font-semibold text-white">
                            <ShieldCheck className="w-4 h-4 text-emerald-400" /> Security posture
                        </div>
                        <div className="flex items-center justify-between text-xs text-slate-300">
                            <span>Local only</span>
                            <span className="font-mono">{assets.filter(a => a.privacy === 'local').length}</span>
                        </div>
                        <div className="flex items-center justify-between text-xs text-slate-300">
                            <span>Shared</span>
                            <span className="font-mono">{assets.filter(a => a.privacy === 'shared').length}</span>
                        </div>
                        <div className="flex items-center justify-between text-xs text-slate-300">
                            <span>Estimated size tracked</span>
                            <span className="font-mono">{totalSize.toFixed(1)} MB</span>
                        </div>
                        <p className="text-[11px] text-slate-500">
                            The Vault tracks source (authoring) paths vs staging (Data/) paths to prevent accidental leaks and keep BA2 packaging deterministic.
                        </p>
                    </div>
                </div>

                {filteredAssets.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-64 text-slate-600">
                        <HardDrive className="w-12 h-12 mb-4 opacity-20" />
                        <p>No assets match the filters.</p>
                    </div>
                ) : (
                    <div className="flex flex-col gap-3">
                        {filteredAssets.map(asset => {
                            const hasIssues = asset.issues.length > 0;
                            return (
                                <div
                                    key={asset.id}
                                    className={`p-4 bg-slate-900/70 border rounded-xl transition-colors ${
                                        hasIssues ? 'border-amber-700/60' : 'border-slate-800'
                                    }`}
                                >
                                    <div className="flex flex-wrap items-start justify-between gap-3">
                                        <div className="flex flex-col gap-1 min-w-[200px]">
                                            <div className="flex items-center gap-2">
                                                <span className="text-sm font-semibold text-white truncate">{asset.name}</span>
                                                <span
                                                    className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold border ${
                                                        asset.type === 'mesh' ? 'text-blue-300 border-blue-700/60 bg-blue-900/20' :
                                                        asset.type === 'texture' ? 'text-purple-200 border-purple-700/60 bg-purple-900/20' :
                                                        asset.type === 'audio' ? 'text-amber-200 border-amber-700/60 bg-amber-900/20' :
                                                        asset.type === 'script' ? 'text-emerald-200 border-emerald-700/60 bg-emerald-900/20' :
                                                        'text-cyan-200 border-cyan-700/60 bg-cyan-900/20'
                                                    }`}
                                                >
                                                    {asset.type}
                                                </span>
                                                <span
                                                    className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold border ${
                                                        asset.privacy === 'local' ? 'bg-red-900/30 text-red-200 border-red-700/60' : 'bg-blue-900/30 text-blue-200 border-blue-700/60'
                                                    }`}
                                                >
                                                    {asset.privacy}
                                                </span>
                                            </div>
                                            <div className="flex flex-wrap gap-1">
                                                {asset.tags.map(tag => (
                                                    <span key={tag} className="px-1.5 py-0.5 bg-slate-800 text-slate-300 rounded text-[10px]">#{tag}</span>
                                                ))}
                                            </div>
                                            <div className="text-[11px] text-slate-500">Last verified: {asset.lastVerified}</div>
                                            {asset.type === 'texture' && (
                                                <div className="mt-1 flex items-center gap-2 text-[11px] text-slate-400">
                                                    <span>Expected format:</span>
                                                    <select
                                                        value={asset.expectedFormat || 'AUTO'}
                                                        onChange={e=>setAssets(prev=>prev.map(a=>a.id===asset.id?{...a, expectedFormat: e.target.value as any}:a))}
                                                        className="bg-slate-900 border border-slate-700 rounded px-2 py-0.5 text-[11px]"
                                                    >
                                                        <option value="AUTO">Auto</option>
                                                        <option value="BC1">BC1</option>
                                                        <option value="BC3">BC3</option>
                                                        <option value="BC5">BC5</option>
                                                    </select>
                                                </div>
                                            )}
                                        </div>

                                        <div className="flex items-center gap-2">
                                            <span className="text-[11px] text-slate-400">{asset.size}</span>
                                            <label className="flex items-center gap-2 text-[11px] text-slate-400 cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    checked={asset.staged}
                                                    onChange={() => toggleStage(asset.id)}
                                                    className="accent-forge-accent"
                                                    disabled={hasIssues}
                                                />
                                                <span className={hasIssues ? 'text-slate-600' : ''}>Stage for BA2{hasIssues ? ' (resolve issues first)' : ''}</span>
                                            </label>
                                        </div>
                                    </div>

                                    <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                                        <div className="bg-slate-950/60 border border-slate-800 rounded p-3 flex flex-col gap-2">
                                            <div className="flex items-center justify-between">
                                                <span className="text-slate-400">Source (authoring)</span>
                                                <button onClick={() => handleCopy(asset.sourcePath)} className="text-forge-accent hover:text-white flex items-center gap-1">
                                                    <Clipboard className="w-3 h-3" /> Copy
                                                </button>
                                            </div>
                                            <div className="font-mono text-slate-200 truncate">{asset.sourcePath}</div>
                                        </div>
                                        <div className="bg-slate-950/60 border border-slate-800 rounded p-3 flex flex-col gap-2">
                                            <div className="flex items-center justify-between">
                                                <span className="text-slate-400">Staging (Data/)</span>
                                                <button onClick={() => handleCopy(asset.targetPath)} className="text-forge-accent hover:text-white flex items-center gap-1">
                                                    <Clipboard className="w-3 h-3" /> Copy
                                                </button>
                                            </div>
                                            <div className="font-mono text-slate-200 truncate">{asset.targetPath}</div>
                                        </div>
                                    </div>

                                    <div className="mt-3 flex flex-wrap gap-2 items-center">
                                        {hasIssues ? (
                                            <span className="flex items-center gap-1 text-amber-300 text-xs font-semibold">
                                                <AlertTriangle className="w-4 h-4" /> {asset.issues.length} issue{asset.issues.length > 1 ? 's' : ''}
                                            </span>
                                        ) : (
                                            <span className="flex items-center gap-1 text-emerald-300 text-xs font-semibold">
                                                <ShieldCheck className="w-4 h-4" /> Ready for archive
                                            </span>
                                        )}
                                        <button
                                            onClick={() => handleVerify(asset)}
                                            disabled={verifyingIds.has(asset.id)}
                                            className={`px-3 py-1 text-xs rounded border flex items-center gap-1 ${
                                                verifyingIds.has(asset.id)
                                                    ? 'border-slate-700 text-slate-500 cursor-not-allowed'
                                                    : 'border-slate-600 text-white hover:border-forge-accent hover:text-forge-accent'
                                            }`}
                                        >
                                            <CheckCircle2 className="w-3 h-3" /> {verifyingIds.has(asset.id) ? 'Verifying...' : 'Verify'}
                                        </button>
                                        <button
                                            onClick={() => togglePrivacy(asset.id)}
                                            className="px-3 py-1 text-xs rounded border border-slate-600 text-slate-200 hover:border-forge-accent"
                                        >
                                            {asset.privacy === 'local' ? 'Make shared' : 'Make local'}
                                        </button>
                                    </div>

                                    {asset.lastRun && (
                                        <div className="mt-2 bg-slate-950/60 border border-slate-800 rounded p-3 text-[11px] text-slate-200 whitespace-pre-wrap">
                                            {asset.lastRun}
                                        </div>
                                    )}

                                    {hasIssues && (
                                        <div className="mt-2 bg-amber-900/30 border border-amber-700/60 rounded p-3 text-[11px] text-amber-100 flex flex-col gap-1">
                                            {asset.issues.map((issue, idx) => (
                                                <div key={idx} className="flex items-start gap-2">
                                                    <AlertTriangle className="w-3 h-3 mt-0.5" />
                                                    <span>{issue}</span>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
};

export default TheVault;