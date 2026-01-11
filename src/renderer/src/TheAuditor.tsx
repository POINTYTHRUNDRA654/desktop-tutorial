import React, { useState, useEffect } from 'react';
import { GoogleGenAI } from "@google/genai";
import { Scan, FileWarning, CheckCircle2, AlertTriangle, FileImage, Box, FileCode, Search, Wrench, ArrowRight, ShieldCheck, RefreshCw, XCircle, File, MessageSquare } from 'lucide-react';

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

const initialFiles: ModFile[] = [
    {
        id: '1', name: 'MyMod.esp', type: 'plugin', path: 'Data/MyMod.esp', size: '14 KB', status: 'pending',
        issues: [] 
    },
    {
        id: '2', name: 'Rifle_Reciever.nif', type: 'mesh', path: 'Data/Meshes/Weapons/Rifle/Receiver.nif', size: '450 KB', status: 'pending',
        issues: []
    },
    {
        id: '3', name: 'Rifle_Main_d.dds', type: 'texture', path: 'Data/Textures/Weapons/Rifle/Main_d.dds', size: '21 MB', status: 'pending',
        issues: []
    },
    {
        id: '4', name: 'Glow_Sight.bgsm', type: 'material', path: 'Data/Materials/Weapons/Rifle/Glow.bgsm', size: '2 KB', status: 'pending',
        issues: []
    }
];

const TheAuditor: React.FC = () => {
    const [files, setFiles] = useState<ModFile[]>(initialFiles);
    const [selectedFileId, setSelectedFileId] = useState<string | null>(null);
    const [isScanning, setIsScanning] = useState(false);
    const [scanProgress, setScanProgress] = useState(0);
    const [mossyAdvice, setMossyAdvice] = useState<string | null>(null);
    const [isFixing, setIsFixing] = useState(false);

    const selectedFile = files.find(f => f.id === selectedFileId);

    // Load previous scan if available
    useEffect(() => {
        const saved = localStorage.getItem('mossy_scan_auditor');
        if (saved) {
            setFiles(JSON.parse(saved));
        }
    }, []);

    // Mock Scan Logic
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

    const performAnalysis = () => {
        const updatedFiles = files.map(f => {
            const newIssues: AuditIssue[] = [];
            let status: ModFile['status'] = 'clean';

            if (f.name.endsWith('.esp')) {
                newIssues.push({
                    id: 'esp-1', severity: 'error', 
                    message: 'Deleted Navmesh Detected', 
                    technicalDetails: 'Record 0001A2B3 in Cell [02, -04] is flagged as deleted.', 
                    fixAvailable: false // Complex fix
                });
                newIssues.push({
                    id: 'esp-2', severity: 'warning', 
                    message: 'Identical To Master (ITM) Records', 
                    technicalDetails: '14 records are identical to Fallout4.esm.', 
                    fixAvailable: true
                });
                status = 'error';
            }
            else if (f.name.endsWith('.nif')) {
                newIssues.push({
                    id: 'nif-1', severity: 'error', 
                    message: 'Absolute Texture Path', 
                    technicalDetails: 'Path "C:/Users/Dev/Desktop/Textures/..." found in BSShaderTextureSet.', 
                    fixAvailable: true
                });
                status = 'error';
            }
            else if (f.name.endsWith('.dds')) {
                // Large size implies no compression or huge res
                newIssues.push({
                    id: 'dds-1', severity: 'warning', 
                    message: 'Unoptimized Compression', 
                    technicalDetails: 'File is 21MB (A8R8G8B8). Recommend BC7 compression.', 
                    fixAvailable: true
                });
                status = 'warning';
            }
            else if (f.name.endsWith('.bgsm')) {
                // Material clean
                status = 'clean';
            }

            return { ...f, issues: newIssues, status };
        });

        setFiles(updatedFiles);
        
        // BROADCAST TO SHARED MEMORY
        localStorage.setItem('mossy_scan_auditor', JSON.stringify(updatedFiles));
        window.dispatchEvent(new Event('mossy-memory-update'));
    };

    const getMossyAdvice = async (issue: AuditIssue) => {
        setMossyAdvice("Analyzing issue...");
        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            const prompt = `
            Act as an expert Fallout 4 Modder AI assistant named Mossy.
            The user has a file with the following error:
            Error: ${issue.message}
            Details: ${issue.technicalDetails}
            
            Provide a concise, friendly explanation of why this is bad for Fallout 4 stability, and how to fix it manually if the auto-fix fails.
            Keep it under 3 sentences.
            `;

            const response = await ai.models.generateContent({
                model: 'gemini-3-flash-preview',
                contents: prompt,
            });
            
            setMossyAdvice(response.text);
        } catch (e) {
            setMossyAdvice("I cannot reach my knowledge base right now, but this usually requires cleaning the plugin in xEdit.");
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
        <div className="h-full flex flex-col bg-[#0d1117] text-slate-200 font-sans overflow-hidden">
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
                    <button 
                        onClick={runAudit}
                        disabled={isScanning}
                        className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg transition-all shadow-[0_0_15px_rgba(5,150,105,0.3)] disabled:opacity-50"
                    >
                        {isScanning ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Scan className="w-4 h-4" />}
                        {isScanning ? 'Analyzing...' : 'Run Audit'}
                    </button>
                </div>
            </div>

            <div className="flex-1 flex overflow-hidden">
                
                {/* Left: File Manifest */}
                <div className="w-80 bg-slate-900/50 border-r border-slate-800 flex flex-col">
                    <div className="p-3 border-b border-slate-800 text-xs font-bold text-slate-500 uppercase tracking-widest bg-slate-900">
                        Mod Manifest
                    </div>
                    <div className="flex-1 overflow-y-auto p-2 space-y-1">
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
                <div className="flex-1 bg-[#0a0d14] flex flex-col overflow-hidden">
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
                            <div className="flex-1 overflow-y-auto p-6 space-y-4">
                                {selectedFile.issues.length === 0 && selectedFile.status !== 'pending' && (
                                    <div className="flex flex-col items-center justify-center h-full text-slate-600 opacity-60">
                                        <CheckCircle2 className="w-24 h-24 mb-4 text-emerald-500" />
                                        <p className="text-lg">No anomalies detected.</p>
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
                                                    className="px-3 py-1 bg-slate-800 hover:bg-emerald-600 text-white rounded text-xs font-bold transition-colors flex items-center gap-1 opacity-0 group-hover:opacity-100 disabled:opacity-50"
                                                >
                                                    <Wrench className="w-3 h-3" /> Auto-Fix
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
                    <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>
                    
                    <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-6 flex items-center gap-2 relative z-10">
                        <Scan className="w-4 h-4 text-emerald-400" /> Analysis Log
                    </h3>

                    <div className="flex-1 overflow-y-auto relative z-10">
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
                                    <button className="flex-1 py-2 bg-emerald-900/30 hover:bg-emerald-900/50 text-emerald-400 border border-emerald-500/30 rounded text-xs transition-colors flex items-center justify-center gap-2">
                                        Apply Fix <ArrowRight className="w-3 h-3" />
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="text-slate-500 text-sm italic">
                                "Click on an issue in the inspector to get a detailed breakdown and fix strategy."
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