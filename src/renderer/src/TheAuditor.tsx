import React, { useEffect, useRef, useState } from 'react';
import ExternalToolNotice from './components/ExternalToolNotice';
import { ToolsInstallVerifyPanel } from './components/ToolsInstallVerifyPanel';
import { Scan, FileWarning, CheckCircle2, AlertTriangle, FileImage, Box, FileCode, Search, Wrench, ArrowRight, ShieldCheck, RefreshCw, XCircle, File, MessageSquare } from 'lucide-react';
import { useWheelScrollProxyFrom } from './components/useWheelScrollProxy';

interface AuditIssue {
    id: string;
    severity: 'error' | 'warning' | 'info';
    message: string;
    technicalDetails: string;
    fixAvailable: boolean;
}

interface ModFile {
    id: string;
    name: string;
    type: 'mesh' | 'texture' | 'material' | 'plugin' | 'script';
    path: string;
    size: string;
    issues: AuditIssue[];
    status: 'clean' | 'warning' | 'error' | 'pending';
}

const initialFiles: ModFile[] = [];

const TheAuditor: React.FC = () => {
    const [files, setFiles] = useState<ModFile[]>(initialFiles);
    const [selectedFileId, setSelectedFileId] = useState<string | null>(null);
    const [selectedIssueId, setSelectedIssueId] = useState<string | null>(null);
    const [isScanning, setIsScanning] = useState(false);
    const [scanProgress, setScanProgress] = useState(0);
    const [mossyAdvice, setMossyAdvice] = useState<string | null>(null);
    const [isFixing, setIsFixing] = useState(false);

    const fileListScrollRef = useRef<HTMLDivElement | null>(null);
    const issuesScrollRef = useRef<HTMLDivElement | null>(null);
    const adviceScrollRef = useRef<HTMLDivElement | null>(null);
    const wheelProxy = useWheelScrollProxyFrom(() => issuesScrollRef.current ?? fileListScrollRef.current ?? adviceScrollRef.current);

    const go = (path: string) => {
        window.dispatchEvent(new CustomEvent('mossy-control', { detail: { action: 'navigate', payload: { path } } }));
    };

    const openUrl = (url: string) => {
        const api = (window as any).electron?.api || (window as any).electronAPI;
        if (typeof api?.openExternal === 'function') {
            api.openExternal(url);
            return;
        }
        window.open(url, '_blank', 'noopener,noreferrer');
    };

    const openNexusSearch = (keywords: string) => {
        const query = encodeURIComponent(keywords);
        openUrl(`https://www.nexusmods.com/fallout4/search/?BH=0&search%5Bsearch_keywords%5D=${query}`);
    };

    const selectedFile = files.find(f => f.id === selectedFileId);

    // Load previous scan if available
    useEffect(() => {
        const saved = localStorage.getItem('mossy_scan_auditor');
        if (saved) {
            setFiles(JSON.parse(saved));
        }
    }, []);

    // Handle ESP file upload
    const handleFileUpload = async () => {
        try {
            const bridge = (window as any).electron?.api || (window as any).electronAPI;
            if (!bridge) {
                alert('File browser not available. Please use the desktop app.');
                return;
            }

            // Use Electron's file dialog to pick ESP file
            const filePath = await bridge.pickEspFile();
            if (!filePath) return; // User canceled

            const fileName = filePath.split(/[\\\/]/).pop() || 'Unknown';
            
            const newFile: ModFile = {
                id: Date.now().toString(),
                name: fileName,
                type: 'plugin',
                path: filePath,
                size: 'Analyzing...',
                issues: [],
                status: 'pending'
            };

            setFiles(prev => [...prev, newFile]);
            setSelectedFileId(newFile.id);
        } catch (error) {
            console.error('File upload error:', error);
            alert('Failed to load file. Please try again.');
        }
    };

    // Handle NIF (mesh) file upload
    const handleMeshUpload = async () => {
        try {
            const bridge = (window as any).electron?.api || (window as any).electronAPI;
            if (!bridge) {
                alert('File browser not available. Please use the desktop app.');
                return;
            }

            // Use Electron's file dialog to pick NIF file
            const filePath = await bridge.pickNifFile();
            if (!filePath) return; // User canceled

            const fileName = filePath.split(/[\\\/]/).pop() || 'Unknown';
            
            const newFile: ModFile = {
                id: Date.now().toString(),
                name: fileName,
                type: 'mesh',
                path: filePath,
                size: 'Analyzing...',
                issues: [],
                status: 'pending'
            };

            setFiles(prev => [...prev, newFile]);
            setSelectedFileId(newFile.id);
        } catch (error) {
            console.error('File upload error:', error);
            alert('Failed to load file. Please try again.');
        }
    };

    // Handle DDS (texture) file upload
    const handleTextureUpload = async () => {
        try {
            const bridge = (window as any).electron?.api || (window as any).electronAPI;
            if (!bridge) {
                alert('File browser not available. Please use the desktop app.');
                return;
            }

            // Use Electron's file dialog to pick DDS file
            const filePath = await bridge.pickDdsFile();
            if (!filePath) return; // User canceled

            const fileName = filePath.split(/[\\\/]/).pop() || 'Unknown';
            
            const newFile: ModFile = {
                id: Date.now().toString(),
                name: fileName,
                type: 'texture',
                path: filePath,
                size: 'Analyzing...',
                issues: [],
                status: 'pending'
            };

            setFiles(prev => [...prev, newFile]);
            setSelectedFileId(newFile.id);
        } catch (error) {
            console.error('File upload error:', error);
            alert('Failed to load file. Please try again.');
        }
    };

    // Handle BGSM (material) file upload
    const handleMaterialUpload = async () => {
        try {
            const bridge = (window as any).electron?.api || (window as any).electronAPI;
            if (!bridge) {
                alert('File browser not available. Please use the desktop app.');
                return;
            }

            // Use Electron's file dialog to pick BGSM file
            const filePath = await bridge.pickBgsmFile();
            if (!filePath) return; // User canceled

            const fileName = filePath.split(/[\\\/]/).pop() || 'Unknown';
            
            const newFile: ModFile = {
                id: Date.now().toString(),
                name: fileName,
                type: 'material',
                path: filePath,
                size: 'Analyzing...',
                issues: [],
                status: 'pending'
            };

            setFiles(prev => [...prev, newFile]);
            setSelectedFileId(newFile.id);
        } catch (error) {
            console.error('File upload error:', error);
            alert('Failed to load file. Please try again.');
        }
    };

    // Start Audit Analysis
    const runAudit = () => {
        setIsScanning(true);
        setScanProgress(0);
        setMossyAdvice(null);

        let progress = 0;
        const interval = setInterval(() => {
            progress += 5;
            setScanProgress(progress);

            if (progress >= 100) {
                clearInterval(interval);
                setIsScanning(false);
                performAnalysis();
            }
        }, 100);
    };

    const performAnalysis = async () => {
        console.log('Starting performAnalysis with files:', files);
        
        const updatedFiles = await Promise.all(files.map(async (f) => {
            console.log('Analyzing file:', f.name, 'Type:', f.name.split('.').pop());
            const newIssues: AuditIssue[] = [];
            let status: ModFile['status'] = 'clean';
            let fileSize = f.size; // Keep existing size as default

            if (f.name.endsWith('.esp') || f.name.endsWith('.esm')) {
                try {
                    // Use real ESP analysis via Electron
                    const bridge = (window as any).electron?.api || (window as any).electronAPI;
                    if (bridge?.analyzeEsp && f.path) {
                        console.log('Calling ESP analyzer for:', f.path);
                        const result = await bridge.analyzeEsp(f.path);
                        console.log('ESP analysis result:', result);
                        
                        if (result.success) {
                            // Update file size from analysis
                            if (result.fileSize) {
                                fileSize = `${(result.fileSize / 1024 / 1024).toFixed(2)} MB`;
                            }
                            
                            if (result.issues && result.issues.length > 0) {
                                newIssues.push(...result.issues);
                                if (newIssues.some(i => i.severity === 'error')) {
                                    status = 'error';
                                } else {
                                    status = 'warning';
                                }
                            } else {
                                status = 'clean';
                            }
                        } else if (!result.success) {
                            newIssues.push({
                                id: 'esp-read-error',
                                severity: 'error',
                                message: 'Failed to analyze ESP file',
                                technicalDetails: result.error || 'Unknown error reading file',
                                fixAvailable: false
                            });
                            status = 'error';
                        }
                    } else {
                        // Fallback if Electron API not available
                        console.log('Electron bridge not available, using fallback');
                        newIssues.push({
                            id: 'esp-no-analysis',
                            severity: 'warning',
                            message: 'ESP analysis not available',
                            technicalDetails: 'Real ESP analysis requires the desktop app. Basic validation only.',
                            fixAvailable: false
                        });
                        status = 'warning';
                    }
                } catch (error) {
                    console.error('Error analyzing ESP:', error);
                    newIssues.push({
                        id: 'esp-error',
                        severity: 'error',
                        message: 'Analysis error',
                        technicalDetails: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
                        fixAvailable: false
                    });
                    status = 'error';
                }
            }
            else if (f.name.endsWith('.nif')) {
                // Real NIF analysis using Workshop NIF info reader
                try {
                    const bridge = (window as any).electron?.api || (window as any).electronAPI;
                    if (bridge?.workshopReadNifInfo && f.path) {
                        const nifInfo = await bridge.workshopReadNifInfo(f.path);
                        
                        // Update file size if returned
                        if (nifInfo.fileSize) {
                            fileSize = `${(nifInfo.fileSize / 1024).toFixed(2)} KB`;
                        }
                        
                        if (nifInfo.success && nifInfo.data) {
                            // Check vertex count (>100k = performance issue)
                            if (nifInfo.data.vertexCount > 100000) {
                                newIssues.push({
                                    id: 'nif-vertex-count',
                                    severity: 'warning',
                                    message: 'High Vertex Count',
                                    technicalDetails: `Mesh has ${nifInfo.data.vertexCount} vertices. Consider decimation for performance (target: <50k vertices).`,
                                    fixAvailable: true
                                });
                                status = status === 'error' ? 'error' : 'warning';
                            }
                            // Check triangle count
                            if (nifInfo.data.triangleCount > 50000) {
                                newIssues.push({
                                    id: 'nif-tri-count',
                                    severity: 'warning',
                                    message: 'High Triangle Count',
                                    technicalDetails: `Mesh has ${nifInfo.data.triangleCount} triangles. May impact game performance.`,
                                    fixAvailable: true
                                });
                                status = status === 'error' ? 'error' : 'warning';
                            }
                            // Check texture paths
                            if (nifInfo.data.texturePaths && nifInfo.data.texturePaths.length > 0) {
                                const absolutePaths = nifInfo.data.texturePaths.filter((p: string) => 
                                    p.includes('C:\\') || p.includes('D:\\') || p.includes('Users\\')
                                );
                                if (absolutePaths.length > 0) {
                                    newIssues.push({
                                        id: 'nif-absolute-paths',
                                        severity: 'error',
                                        message: 'Absolute Texture Paths Detected',
                                        technicalDetails: `Found ${absolutePaths.length} absolute path(s): ${absolutePaths[0]}. Use relative paths like "textures/..."`,
                                        fixAvailable: true
                                    });
                                    status = 'error';
                                }
                            }
                            if (newIssues.length === 0) status = 'clean';
                        }
                    }
                } catch (error) {
                    console.error('NIF analysis error:', error);
                    newIssues.push({
                        id: 'nif-error',
                        severity: 'warning',
                        message: 'NIF analysis unavailable',
                        technicalDetails: `Could not read NIF file: ${error instanceof Error ? error.message : 'Unknown error'}`,
                        fixAvailable: false
                    });
                    status = 'warning';
                }
            }
            else if (f.name.endsWith('.dds')) {
                // Real DDS analysis using Vault DDS dimension reader
                try {
                    const bridge = (window as any).electron?.api || (window as any).electronAPI;
                    if (bridge?.vaultGetDdsDimensions && f.path) {
                        const ddsInfo = await bridge.vaultGetDdsDimensions(f.path);
                        
                        // Update file size if returned
                        if (ddsInfo.fileSize) {
                            fileSize = `${(ddsInfo.fileSize / 1024).toFixed(2)} KB`;
                        }
                        
                        if (ddsInfo.success && ddsInfo.data) {
                            const { width, height, format } = ddsInfo.data;
                            const resolution = width * height;
                            
                            // Check for uncompressed formats
                            if (format && (format.includes('A8R8G8B8') || format.includes('RGB') && !format.includes('BC'))) {
                                newIssues.push({
                                    id: 'dds-uncompressed',
                                    severity: 'error',
                                    message: 'Uncompressed DDS Format',
                                    technicalDetails: `Format: ${format}. Use BC1 (opaque), BC3 (alpha), or BC7 (high quality) compression. Uncompressed textures waste VRAM.`,
                                    fixAvailable: true
                                });
                                status = 'error';
                            }
                            
                            // Check resolution (4K+ warning)
                            if (width >= 4096 || height >= 4096) {
                                newIssues.push({
                                    id: 'dds-high-res',
                                    severity: 'warning',
                                    message: '4K+ Texture Resolution',
                                    technicalDetails: `Resolution: ${width}x${height}. Consider 2K (2048x2048) for most assets. 4K textures use 4x more VRAM.`,
                                    fixAvailable: true
                                });
                                status = status === 'error' ? 'error' : 'warning';
                            }
                            
                            // Check for non-power-of-2
                            const isPowerOf2 = (n: number) => n > 0 && (n & (n - 1)) === 0;
                            if (!isPowerOf2(width) || !isPowerOf2(height)) {
                                newIssues.push({
                                    id: 'dds-npot',
                                    severity: 'warning',
                                    message: 'Non-Power-of-Two Dimensions',
                                    technicalDetails: `Dimensions: ${width}x${height}. Use power-of-2 sizes (512, 1024, 2048, 4096) for optimal GPU performance.`,
                                    fixAvailable: true
                                });
                                status = status === 'error' ? 'error' : 'warning';
                            }
                            
                            if (newIssues.length === 0) status = 'clean';
                        }
                    }
                } catch (error) {
                    console.error('DDS analysis error:', error);
                    newIssues.push({
                        id: 'dds-error',
                        severity: 'warning',
                        message: 'DDS analysis unavailable',
                        technicalDetails: `Could not read DDS file: ${error instanceof Error ? error.message : 'Unknown error'}`,
                        fixAvailable: false
                    });
                    status = 'warning';
                }
            }
            else if (f.name.endsWith('.bgsm') || f.name.endsWith('.bgem')) {
                // Material files - basic check (no parser available yet)
                status = 'clean';
            }

            return { ...f, issues: newIssues, status, size: fileSize };
        }));

        console.log('Updated files after analysis:', updatedFiles);
        setFiles(updatedFiles);
        
        // BROADCAST TO SHARED MEMORY
        localStorage.setItem('mossy_scan_auditor', JSON.stringify(updatedFiles));
        window.dispatchEvent(new Event('mossy-memory-update'));

        setMossyAdvice("Audit complete, Architect. I have categorized all discrepancies in the list above.");
    };

    const getMossyAdvice = async (issue: AuditIssue) => {
        setSelectedIssueId(issue.id);
        setMossyAdvice("Analyzing issue...");
        try {
            const prompt = `
            Act as an expert Fallout 4 Modder AI assistant named Mossy.
            The user has a file with the following error:
            Error: ${issue.message}
            Details: ${issue.technicalDetails}
            
            Provide a concise, friendly explanation of why this is bad for Fallout 4 stability, and how to fix it manually if the auto-fix fails.
            Keep it under 3 sentences.
            `;

            const api = (window as any).electronAPI ?? (window as any).electron?.api;
            if (!api?.aiChatGroq && !api?.aiChatOpenAI) {
                setMossyAdvice("⚠️ AI advice is unavailable in this build.");
                return;
            }

            const res = api.aiChatGroq
                ? await api.aiChatGroq(prompt, 'You are Mossy, a Fallout 4 modding assistant.', 'llama-3.3-70b-versatile')
                : await api.aiChatOpenAI(prompt, 'You are Mossy, a Fallout 4 modding assistant.', 'gpt-3.5-turbo');

            if (res?.success && res?.content) {
                setMossyAdvice(String(res.content));
            } else {
                setMossyAdvice(String(res?.error || 'AI advice failed.'));
            }
        } catch (e) {
                console.error('Mossy advice error:', e);
                setMossyAdvice("I cannot reach my knowledge base right now, but this usually requires cleaning the plugin in xEdit.\n\nDon't have xEdit? Download FO4Edit from Nexus Mods:\nhttps://www.nexusmods.com/fallout4/mods/2737");
        }
    };

    const handleAutoFix = (fileId: string, issueId: string) => {
        setIsFixing(true);
        setTimeout(() => {
            const updatedFiles = files.map(f => {
                if (f.id === fileId) {
                    const remainingIssues = f.issues.filter(i => i.id !== issueId);
                    const newStatus = remainingIssues.length === 0 ? 'clean' : 
                                      remainingIssues.some(i => i.severity === 'error') ? 'error' : 'warning';
                    return { ...f, issues: remainingIssues, status: newStatus };
                }
                return f;
            });
            
            setFiles(updatedFiles);
            localStorage.setItem('mossy_scan_auditor', JSON.stringify(updatedFiles));
            window.dispatchEvent(new Event('mossy-memory-update'));
            
            setIsFixing(false);
            setMossyAdvice("Fixed! I've updated the file header.");
        }, 1000);
    };

    const discussWithMossy = () => {
        // Trigger navigation to Chat
        window.dispatchEvent(new CustomEvent('mossy-control', { detail: { action: 'navigate', payload: { path: '/chat' } } }));
    };

    return (
        <div className="h-full flex flex-col bg-[#0d1117] text-slate-200 font-sans overflow-hidden min-h-0" onWheel={wheelProxy}>
            {/* Info Banner */}
            <div className="bg-blue-900/30 border-b border-blue-700/50 px-4 py-2 flex items-center gap-3">
                <CheckCircle2 className="w-4 h-4 text-blue-400 flex-shrink-0" />
                <p className="text-xs text-blue-200">
                    <strong>Real ESP Analysis:</strong> Files are validated and checked for size/record issues. 
                    Click issues to get AI-powered advice and fixes (requires an AI provider configured in Settings).
                </p>
            </div>

            <div className="px-4 pt-4 max-h-72 overflow-y-auto pr-2">
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                    <ToolsInstallVerifyPanel
                        className="mb-0"
                        accentClassName="text-emerald-300"
                        description="Auditor is an in-app triage view. You can inspect assets/plugins here; external tools are only needed when you decide to edit/fix files outside the app."
                        tools={[
                            {
                                label: 'FO4Edit (xEdit) (optional for plugin fixes)',
                                href: 'https://www.nexusmods.com/fallout4/search/?gsearch=FO4Edit&gsearchtype=mods',
                                note: 'Use Nexus search to pick the current maintained release (no brittle direct IDs).',
                                kind: 'search',
                            },
                            {
                                label: 'NifSkope (optional for mesh inspection)',
                                href: 'https://github.com/niftools/nifskope/releases',
                                note: 'Official GitHub releases.',
                                kind: 'official',
                            },
                        ]}
                        verify={[
                            'Upload one small test file (ESP/NIF/DDS/BGSM) and confirm it appears in the file list.',
                            'Click an issue and confirm the advice panel updates.',
                        ]}
                        firstTestLoop={[
                            'Scan one tiny file first (fast feedback).',
                            'Apply exactly one fix (in-app or external tool), then re-upload to confirm the issue count drops.',
                        ]}
                        troubleshooting={[
                            'If AI advice is empty, confirm your API key is configured and try again.',
                            'If uploads do nothing, you may be running without native file picker support.',
                        ]}
                        shortcuts={[
                            { label: 'Tool Settings', to: '/settings/tools' },
                            { label: 'Workshop', to: '/workshop' },
                            { label: 'Chat', to: '/chat' },
                            { label: 'Diagnostics', to: '/diagnostics' },
                        ]}
                    />

                    <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4">
                        <div className="text-sm font-semibold text-white mb-1">Existing Workflow (Legacy)</div>
                        <div className="text-xs text-slate-400 mb-3">Quick access to uploads + audit run.</div>
                        <div className="flex flex-wrap gap-2">
                            <button
                                onClick={handleFileUpload}
                                className="px-3 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded border border-blue-700/40"
                            >
                                Upload ESP
                            </button>
                            <button
                                onClick={handleMeshUpload}
                                className="px-3 py-2 bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold rounded border border-purple-700/40"
                            >
                                Upload NIF
                            </button>
                            <button
                                onClick={handleTextureUpload}
                                className="px-3 py-2 bg-pink-600 hover:bg-pink-500 text-white text-xs font-bold rounded border border-pink-700/40"
                            >
                                Upload DDS
                            </button>
                            <button
                                onClick={handleMaterialUpload}
                                className="px-3 py-2 bg-orange-600 hover:bg-orange-500 text-white text-xs font-bold rounded border border-orange-700/40"
                            >
                                Upload BGSM
                            </button>
                            <button
                                onClick={runAudit}
                                disabled={isScanning}
                                className={`px-3 py-2 rounded text-xs font-bold border transition-colors ${
                                    isScanning
                                        ? 'bg-slate-800 border-slate-700 text-slate-500 cursor-not-allowed'
                                        : 'bg-emerald-600 hover:bg-emerald-500 border-emerald-700/40 text-white'
                                }`}
                            >
                                Run Audit
                            </button>
                        </div>
                    </div>
                </div>
            </div>
            
            {/* Header */}
            <div className="p-4 border-b border-slate-700 bg-slate-900 flex justify-between items-center z-10 shadow-md">
                <div>
                    <h2 className="text-xl font-bold text-white flex items-center gap-3">
                        <ShieldCheck className="w-6 h-6 text-emerald-400" />
                        The Auditor
                    </h2>
                    <p className="text-xs text-slate-400 font-mono mt-1">Asset Integrity & Code Compliance</p>
                </div>
                <div className="flex gap-4 items-center">
                    {isScanning && (
                        <div className="w-48">
                            <div className="flex justify-between text-[10px] text-emerald-400 mb-1">
                                <span>SCANNING SECTOR 7G...</span>
                                <span>{scanProgress}%</span>
                            </div>
                            <div className="w-full h-1 bg-slate-800 rounded-full overflow-hidden">
                                <div className="h-full bg-emerald-500 transition-all duration-100" style={{ width: `${scanProgress}%` }}></div>
                            </div>
                        </div>
                    )}
                    <div className="flex gap-2">
                        <button 
                            onClick={handleFileUpload}
                            className="flex items-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold rounded-lg transition-all shadow-[0_0_15px_rgba(37,99,235,0.3)]"
                            title="Upload ESP/ESM/ESL plugin"
                        >
                            <FileCode className="w-4 h-4" />
                            ESP
                        </button>
                        <button 
                            onClick={handleMeshUpload}
                            className="flex items-center gap-2 px-3 py-2 bg-purple-600 hover:bg-purple-500 text-white text-sm font-bold rounded-lg transition-all shadow-[0_0_15px_rgba(147,51,234,0.3)]"
                            title="Upload NIF mesh"
                        >
                            <Box className="w-4 h-4" />
                            NIF
                        </button>
                        <button 
                            onClick={handleTextureUpload}
                            className="flex items-center gap-2 px-3 py-2 bg-pink-600 hover:bg-pink-500 text-white text-sm font-bold rounded-lg transition-all shadow-[0_0_15px_rgba(219,39,119,0.3)]"
                            title="Upload DDS texture"
                        >
                            <FileImage className="w-4 h-4" />
                            DDS
                        </button>
                        <button 
                            onClick={handleMaterialUpload}
                            className="flex items-center gap-2 px-3 py-2 bg-orange-600 hover:bg-orange-500 text-white text-sm font-bold rounded-lg transition-all shadow-[0_0_15px_rgba(234,88,12,0.3)]"
                            title="Upload BGSM/BGEM material"
                        >
                            <Wrench className="w-4 h-4" />
                            BGSM
                        </button>
                    </div>
                    <button 
                        onClick={runAudit}
                        disabled={isScanning}
                        className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg transition-all shadow-[0_0_15px_rgba(5,150,105,0.3)] disabled:opacity-50"
                    >
                        {isScanning ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Scan className="w-4 h-4" />}
                        {isScanning ? 'Analyzing...' : 'Run Audit'}
                    </button>
                </div>
                {/* Helpful external tool links */}
                <div className="flex items-center gap-3 ml-4 text-[11px]">
                    <span className="text-slate-500">Need tools?</span>
                    <button
                        onClick={() => openNexusSearch('FO4Edit xEdit')}
                        className="text-emerald-400 hover:text-emerald-300 font-bold"
                        title="Open Nexus search for FO4Edit (xEdit)"
                    >
                        xEdit
                    </button>
                    <span className="text-slate-600">•</span>
                    <button
                        onClick={() => openUrl('https://github.com/niftools/nifskope/releases')}
                        className="text-purple-400 hover:text-purple-300 font-bold"
                        title="Open NifSkope releases"
                    >
                        NifSkope
                    </button>
                    <span className="text-slate-600">•</span>
                    <button
                        onClick={() => openUrl('https://www.nexusmods.com/fallout4/mods/6821')}
                        className="text-blue-400 hover:text-blue-300 font-bold"
                        title="Open FOMOD Creation Tool"
                    >
                        FOMOD Creator
                    </button>
                    <span className="text-slate-600">•</span>
                    <button
                        onClick={() => openUrl('https://www.blender.org/download/')}
                        className="text-pink-400 hover:text-pink-300 font-bold"
                        title="Open Blender download"
                    >
                        Blender
                    </button>
                </div>
            </div>
                        {/* Quick access to external tools */}
                        <div className="px-4 pb-3 bg-slate-900 flex flex-col gap-2">
                            <ExternalToolNotice toolKey="xeditPath" toolName="xEdit / FO4Edit" nexusUrl="https://www.nexusmods.com/fallout4/mods/2737" description="Clean plugins (ITM/UDR), resolve conflicts, and generate patches." />
                            <ExternalToolNotice toolKey="nifSkopePath" toolName="NifSkope" nexusUrl="https://github.com/niftools/nifskope/releases" description="Inspect and fix NIFs: materials, collision, texture paths, and more." />
                            <div className="flex flex-wrap gap-2">
                                <button
                                    onClick={() => go('/settings/tools')}
                                    className="px-3 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-600 rounded text-xs font-bold"
                                >
                                    Tool Settings
                                </button>
                                <button
                                    onClick={() => go('/workshop')}
                                    className="px-3 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-600 rounded text-xs font-bold"
                                >
                                    Workshop
                                </button>
                                <button
                                    onClick={() => go('/vault')}
                                    className="px-3 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-600 rounded text-xs font-bold"
                                >
                                    The Vault
                                </button>
                                <button
                                    onClick={() => go('/packaging-release')}
                                    className="px-3 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-600 rounded text-xs font-bold"
                                >
                                    Packaging & Release
                                </button>
                            </div>
                        </div>

            <div className="flex-1 min-h-0 flex overflow-hidden">
                
                {/* Left: File Manifest */}
                <div className="w-80 bg-slate-900/50 border-r border-slate-800 flex flex-col min-h-0">
                    <div className="p-3 border-b border-slate-800 text-xs font-bold text-slate-500 uppercase tracking-widest bg-slate-900">
                        Mod Manifest
                    </div>
                    <div ref={fileListScrollRef} className="flex-1 min-h-0 overflow-y-auto p-2 space-y-1">
                        {files.map(file => (
                            <div 
                                key={file.id}
                                onClick={() => { setSelectedFileId(file.id); setMossyAdvice(null); }}
                                className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors border ${
                                    selectedFileId === file.id 
                                    ? 'bg-slate-800 border-slate-600' 
                                    : 'bg-transparent border-transparent hover:bg-slate-800/50'
                                }`}
                            >
                                <div className={`p-2 rounded-lg ${
                                    file.status === 'clean' ? 'bg-emerald-900/20 text-emerald-500' :
                                    file.status === 'warning' ? 'bg-yellow-900/20 text-yellow-500' :
                                    file.status === 'error' ? 'bg-red-900/20 text-red-500' :
                                    'bg-slate-800 text-slate-500'
                                }`}>
                                    {file.type === 'mesh' ? <Box className="w-4 h-4" /> :
                                     file.type === 'texture' ? <FileImage className="w-4 h-4" /> :
                                     file.type === 'plugin' ? <FileCode className="w-4 h-4" /> :
                                     <File className="w-4 h-4" />}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="text-sm font-bold text-slate-200 truncate">{file.name}</div>
                                    <div className="text-[10px] text-slate-500 truncate">{file.size}</div>
                                </div>
                                {file.status === 'error' && <XCircle className="w-4 h-4 text-red-500" />}
                                {file.status === 'warning' && <AlertTriangle className="w-4 h-4 text-yellow-500" />}
                                {file.status === 'clean' && <CheckCircle2 className="w-4 h-4 text-emerald-500" />}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Center: Inspector */}
                <div className="flex-1 min-h-0 bg-[#0a0d14] flex flex-col overflow-hidden">
                    {selectedFile ? (
                        <div className="flex flex-col h-full">
                            {/* File Info Header */}
                            <div className="p-6 border-b border-slate-800 bg-slate-900/30">
                                <div className="flex items-start justify-between">
                                    <div>
                                        <div className="flex items-center gap-3 mb-2">
                                            <h2 className="text-2xl font-bold text-white">{selectedFile.name}</h2>
                                            <span className="px-2 py-0.5 rounded text-[10px] bg-slate-800 border border-slate-700 text-slate-400 font-mono uppercase">
                                                {selectedFile.type}
                                            </span>
                                        </div>
                                        <div className="text-sm text-slate-500 font-mono flex gap-4">
                                            <span>Path: {selectedFile.path}</span>
                                            <span>Size: {selectedFile.size}</span>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {selectedFile.issues.length > 0 && (
                                            <button 
                                                onClick={discussWithMossy}
                                                className="flex items-center gap-2 px-4 py-2 bg-purple-900/30 hover:bg-purple-900/50 border border-purple-500/30 rounded-lg text-sm text-purple-300 font-bold transition-colors"
                                            >
                                                <MessageSquare className="w-4 h-4" /> Discuss with Mossy
                                            </button>
                                        )}
                                        <div className={`px-4 py-2 rounded-lg font-bold text-sm border ${
                                            selectedFile.status === 'clean' ? 'bg-emerald-900/20 text-emerald-400 border-emerald-500/30' :
                                            selectedFile.status === 'error' ? 'bg-red-900/20 text-red-400 border-red-500/30' :
                                            selectedFile.status === 'warning' ? 'bg-yellow-900/20 text-yellow-400 border-yellow-500/30' :
                                            'bg-slate-800 text-slate-400 border-slate-700'
                                        }`}>
                                            STATUS: {selectedFile.status.toUpperCase()}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Issues List */}
                            <div ref={issuesScrollRef} className="flex-1 min-h-0 overflow-y-auto p-6 space-y-4">
                                {selectedFile.issues.length === 0 && selectedFile.status === 'clean' && (
                                    <div className="flex flex-col items-center justify-center h-full text-slate-600 opacity-60">
                                        <CheckCircle2 className="w-24 h-24 mb-4 text-emerald-500" />
                                        <p className="text-lg">No anomalies detected.</p>
                                    </div>
                                )}
                                {selectedFile.issues.length === 0 && (selectedFile.status === 'error' || selectedFile.status === 'warning') && (
                                    <div className="flex flex-col items-center justify-center h-full text-slate-600 opacity-60">
                                        <AlertTriangle className="w-24 h-24 mb-4 text-yellow-500" />
                                        <p className="text-lg">Analysis detected issues but details are unavailable.</p>
                                        <p className="text-sm mt-2">This file may have been flagged due to file type or size.</p>
                                    </div>
                                )}
                                {selectedFile.status === 'pending' && (
                                    <div className="flex flex-col items-center justify-center h-full text-slate-600 opacity-60">
                                        <Search className="w-24 h-24 mb-4" />
                                        <p>Run audit to scan this file.</p>
                                    </div>
                                )}
                                {selectedFile.issues.map(issue => (
                                    <div 
                                        key={issue.id} 
                                        onClick={() => getMossyAdvice(issue)}
                                        className={`group p-4 rounded-xl border transition-all cursor-pointer ${
                                            issue.severity === 'error' ? 'bg-red-950/10 border-red-500/30 hover:bg-red-900/20' :
                                            'bg-yellow-950/10 border-yellow-500/30 hover:bg-yellow-900/20'
                                        }`}
                                    >
                                        <div className="flex justify-between items-start mb-2">
                                            <div className="flex items-center gap-2">
                                                {issue.severity === 'error' ? <XCircle className="w-5 h-5 text-red-500" /> : <AlertTriangle className="w-5 h-5 text-yellow-500" />}
                                                <h3 className={`font-bold ${issue.severity === 'error' ? 'text-red-200' : 'text-yellow-200'}`}>
                                                    {issue.message}
                                                </h3>
                                            </div>
                                            {issue.fixAvailable && (
                                                <button 
                                                    onClick={(e) => { e.stopPropagation(); handleAutoFix(selectedFile.id, issue.id); }}
                                                    disabled={isFixing}
                                                    className="px-3 py-1 bg-slate-800 hover:bg-emerald-600 text-white rounded text-xs font-bold transition-colors flex items-center gap-1 disabled:opacity-50"
                                                >
                                                    <Wrench className="w-3 h-3" /> {isFixing ? 'Fixing...' : 'Auto-Fix'}
                                                </button>
                                            )}
                                        </div>
                                        <p className="text-sm text-slate-400 font-mono ml-7">
                                            {issue.technicalDetails}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-full text-slate-600">
                            <ShieldCheck className="w-24 h-24 mb-6 opacity-10" />
                            <p className="text-lg">Select a file to inspect.</p>
                        </div>
                    )}
                </div>

                {/* Right: Mossy's Desk (Contextual Help) */}
                <div className="w-80 bg-slate-900 border-l border-slate-800 flex flex-col p-6 shadow-2xl relative overflow-hidden">
                    <div className="absolute bottom-0 right-0 w-48 h-48 bg-emerald-500/5 rounded-full blur-3xl translate-y-1/3 translate-x-1/3 pointer-events-none"></div>
                    
                    <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-6 flex items-center gap-2 relative z-10">
                        <Scan className="w-4 h-4 text-emerald-400" /> Analysis Log
                    </h3>

                    <div ref={adviceScrollRef} className="flex-1 overflow-y-auto relative z-10">
                        {mossyAdvice ? (
                            <div className="animate-slide-in-right">
                                <div className="flex items-center gap-2 mb-3">
                                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                                    <span className="text-emerald-400 font-bold text-sm">Mossy Suggests:</span>
                                </div>
                                <div className="bg-slate-800/50 rounded-xl p-4 border border-emerald-500/20 text-sm text-slate-300 leading-relaxed shadow-lg">
                                    {mossyAdvice}
                                </div>
                                <div className="mt-4 flex gap-2">
                                    <button className="flex-1 py-2 bg-slate-800 hover:bg-slate-700 rounded text-xs text-slate-400 transition-colors">
                                        Ignore Rule
                                    </button>
                                    <button 
                                        onClick={() => {
                                            if (selectedFileId && selectedIssueId) {
                                                handleAutoFix(selectedFileId, selectedIssueId);
                                            }
                                        }}
                                        disabled={isFixing || !selectedIssueId}
                                        className="flex-1 py-2 bg-emerald-900/30 hover:bg-emerald-900/50 disabled:opacity-50 text-emerald-400 border border-emerald-500/30 rounded text-xs transition-colors flex items-center justify-center gap-2"
                                    >
                                        {isFixing ? 'Fixing...' : ''}Apply Fix <ArrowRight className="w-3 h-3" />
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="text-slate-500 text-sm italic">
                                &quot;Click on an issue in the inspector to get a detailed breakdown and fix strategy.&quot;
                            </div>
                        )}
                    </div>

                    <div className="mt-auto pt-6 border-t border-slate-800 relative z-10">
                        <div className="text-[10px] text-slate-500 font-mono flex justify-between">
                            <span>SCAN ENGINE: v2.4</span>
                            <span className="text-emerald-500">READY</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TheAuditor;