import React, { useRef, useState } from 'react';
import { Bug, AlertTriangle, Activity, Search, FileText, Cpu, ShieldCheck, RefreshCw, CheckCircle2, ArrowRight, Code, Upload } from 'lucide-react';

interface CrashLog {
    id: string;
    filename: string;
    date: string;
    engine: string; // e.g., Fallout 4
    preview: string; // First few lines
    content: string;
}

const initialLogs: CrashLog[] = [];

type Analysis = { culprit: string; confidence: string; reason: string; fix: string; key_signatures: string[] };

const parseEngine = (lines: string[]): string => {
    const engineLine = lines.find((l) => /Fallout 4/i.test(l) || /Skyrim/i.test(l));
    return engineLine ? engineLine.trim() : 'Unknown engine';
};

const parsePreview = (lines: string[]): string => {
    const exc = lines.find((l) => /EXCEPTION|exception/i.test(l));
    return exc ? exc.trim() : (lines[0] || '').trim();
};

const extractSignatures = (lines: string[]): string[] => {
    const stackLines = lines.filter((l) => /0x[0-9A-Fa-f]+/.test(l) && /\.exe\+|\.dll\+|Buffout|TESObject/i.test(l)).slice(0, 5);
    return stackLines.slice(0, 3).map((l) => l.trim());
};

const analyzeCrashLog = (content: string): Analysis => {
    const lines = content.split('\n');
    const exceptionLine = lines.find((l) => /EXCEPTION_ACCESS_VIOLATION|Unhandled exception/i.test(l)) || '';
    const regs = lines.filter((l) => /^R[A-Z]{2}:/.test(l.trim()));
    const hasNullReg = regs.some((r) => /RAX:\s*0x0/.test(r) || /RCX:\s*0x0/.test(r));
    const stack = lines.filter((l) => /TESObjectREFR|BSLightingShaderProperty|NiSkinInstance|Havok|Papyrus/i.test(l));
    const formIdLine = lines.find((l) => /FormID:/i.test(l));
    const fileLine = lines.find((l) => /File:\s*".+"/i.test(l));

    let culprit = 'Fallout4.exe';
    if (fileLine) {
        const match = fileLine.match(/File:\s*"([^"]+)"/i);
        if (match && match[1]) culprit = match[1];
    } else if (/Buffout/i.test(content)) {
        culprit = 'Buffout 4 (runtime)';
    }

    let reason = 'Unknown crash cause';
    if (/EXCEPTION_ACCESS_VIOLATION/i.test(exceptionLine)) {
        if (hasNullReg) {
            reason = 'Null pointer dereference (accessed address 0x0).';
        } else {
            reason = 'Access violation (bad pointer or freed object).';
        }
    }
    if (stack.some((l) => /BSLightingShaderProperty/i.test(l))) {
        reason = 'Likely bad mesh or shader property (BSLightingShaderProperty).';
    }
    if (stack.some((l) => /TESObjectREFR/i.test(l))) {
        reason = 'Dereference of TESObjectREFR; object may be deleted or invalid.';
    }

    let fix = 'Validate affected plugin assets and rerun with Buffout logs enabled.';
    if (culprit.endsWith('.esp') || culprit.endsWith('.esm')) {
        fix = `Reinstall or disable ${culprit}; check meshes and scripts referenced around the crash.`;
    } else if (/Buffout/i.test(culprit)) {
        fix = 'Update Buffout 4 and verify prerequisites (Address Library, TBB).';
    }
    if (stack.some((l) => /BSLightingShaderProperty/i.test(l))) {
        fix = 'Open referenced mesh in NifSkope; fix shader blocks and ensure textures exist.';
    }

    const key_signatures = extractSignatures(lines);
    if (formIdLine && !key_signatures.includes(formIdLine.trim())) {
        key_signatures.push(formIdLine.trim());
    }

    const confidence = reason === 'Unknown crash cause' ? 'Low' : 'Medium';

    return {
        culprit,
        confidence,
        reason,
        fix,
        key_signatures: key_signatures.length ? key_signatures : ['No stack signatures detected'],
    };
};

const TheCrucible: React.FC = () => {
    const [logs, setLogs] = useState<CrashLog[]>(initialLogs);
    const [selectedLog, setSelectedLog] = useState<CrashLog | null>(null);
        const [analysis, setAnalysis] = useState<Analysis | null>(null);
        const [isAnalyzing, setIsAnalyzing] = useState(false);
        const fileInputRef = useRef<HTMLInputElement | null>(null);

        const handleLoadLog = () => {
                fileInputRef.current?.click();
        };

        const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
                const file = e.target.files?.[0];
                if (!file) return;

                const reader = new FileReader();
                reader.onload = () => {
                    const text = typeof reader.result === 'string' ? reader.result : '';
                    const lines = text.split('\n');
                    const newLog: CrashLog = {
                        id: `${Date.now()}`,
                        filename: file.name,
                        date: new Date(file.lastModified).toLocaleString(),
                        engine: parseEngine(lines),
                        preview: parsePreview(lines),
                        content: text,
                    };
                    setLogs((prev) => [newLog, ...prev]);
                    setSelectedLog(newLog);
                    setAnalysis(null);
                };
                reader.readAsText(file);
                // Reset input so selecting the same file again triggers change
                e.target.value = '';
        };

    const handleSelectLog = (log: CrashLog) => {
        setSelectedLog(log);
        setAnalysis(null);
    };

    const handleAnalyze = () => {
        if (!selectedLog) return;
        setIsAnalyzing(true);
        const result = analyzeCrashLog(selectedLog.content);
        setAnalysis(result);
        setIsAnalyzing(false);
    };

    return (
        <div className="h-full flex flex-col bg-[#0f0505] text-slate-200 font-sans">
            {/* Header */}
            <div className="p-4 border-b border-red-900/30 bg-[#1a0b0b] flex justify-between items-center shadow-lg z-10">
                <div>
                    <h2 className="text-xl font-bold text-white flex items-center gap-3">
                        <Bug className="w-6 h-6 text-red-500" />
                        The Crucible
                    </h2>
                    <p className="text-xs text-red-300/60 font-mono mt-1">Crash Forensics & Instability Analysis</p>
                </div>
                <div className="flex gap-2">
                    <button className="flex items-center gap-2 px-3 py-1.5 bg-red-900/20 hover:bg-red-900/40 border border-red-500/30 rounded text-xs text-red-300 font-bold transition-colors">
                        <RefreshCw className="w-3 h-3" /> Rescan Logs
                    </button>
                </div>
            </div>

            <div className="flex-1 flex overflow-hidden">
                {/* Left: Log List */}
                <div className="w-72 bg-[#140a0a] border-r border-red-900/20 flex flex-col">
                    <div className="p-3 border-b border-red-900/20 text-xs font-bold text-red-400 uppercase tracking-widest bg-[#1a0b0b]">
                        Recent Incidents
                    </div>
                                        <div className="p-3 border-b border-red-900/20 bg-[#1a0b0b] flex items-center gap-2 text-[11px] text-slate-300">
                                                <button
                                                    onClick={handleLoadLog}
                                                    className="flex items-center gap-2 px-3 py-1.5 bg-red-700 hover:bg-red-600 text-white rounded text-[11px] font-bold transition-colors"
                                                >
                                                    <Upload className="w-3 h-3" /> Load Crash Log
                                                </button>
                                                <input
                                                    ref={fileInputRef}
                                                    type="file"
                                                    accept=".log,.txt"
                                                    className="hidden"
                                                    onChange={handleFileChange}
                                                />
                                        </div>
                    <div className="flex-1 overflow-y-auto">
                        {logs.map(log => (
                            <div 
                                key={log.id} 
                                onClick={() => handleSelectLog(log)}
                                className={`p-4 border-b border-red-900/10 cursor-pointer transition-colors hover:bg-red-900/10 ${selectedLog?.id === log.id ? 'bg-red-900/20 border-l-2 border-l-red-500' : ''}`}
                            >
                                <div className="flex justify-between items-start mb-1">
                                    <span className="text-xs font-bold text-slate-200 truncate max-w-[140px]">{log.filename}</span>
                                    <span className="text-[10px] text-slate-500">{log.date}</span>
                                </div>
                                <div className="text-[10px] text-red-300/70 truncate font-mono mb-2">{log.engine}</div>
                                <div className="text-[10px] text-slate-500 line-clamp-2 bg-black/20 p-1 rounded font-mono">
                                    {log.preview}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Center: Raw Log Viewer */}
                <div className="flex-1 bg-[#0a0505] flex flex-col relative overflow-hidden">
                    <div className="p-3 border-b border-red-900/20 bg-[#140a0a] flex justify-between items-center">
                        <span className="text-xs font-bold text-slate-400 flex items-center gap-2">
                            <FileText className="w-3 h-3" /> 
                            {selectedLog ? selectedLog.filename : "No Log Selected"}
                        </span>
                        {selectedLog && (
                            <button 
                                onClick={handleAnalyze}
                                disabled={isAnalyzing}
                                className="flex items-center gap-2 px-4 py-1.5 bg-red-600 hover:bg-red-500 text-white rounded text-xs font-bold transition-all shadow-[0_0_15px_rgba(220,38,38,0.3)] disabled:opacity-50"
                            >
                                {isAnalyzing ? <Activity className="w-3 h-3 animate-spin" /> : <ShieldCheck className="w-3 h-3" />}
                                {isAnalyzing ? 'Diagnosing...' : 'Analyze Trace'}
                            </button>
                        )}
                    </div>
                    
                    <div className="flex-1 overflow-auto p-6 font-mono text-xs leading-relaxed text-slate-400 custom-scrollbar">
                        {selectedLog ? (
                            <pre className="whitespace-pre-wrap">
                                {selectedLog.content.split('\n').map((line, i) => {
                                    if (line.includes('EXCEPTION')) return <span key={i} className="text-red-500 font-bold block">{line}</span>;
                                    if (line.includes('File:')) return <span key={i} className="text-blue-400 font-bold block">{line}</span>;
                                    if (line.includes('FormID:')) return <span key={i} className="text-yellow-400 block">{line}</span>;
                                    if (line.includes('STACK:')) return <span key={i} className="text-red-400 font-bold mt-4 block border-b border-red-900/30 pb-1">{line}</span>;
                                    return <span key={i} className="block">{line}</span>;
                                })}
                            </pre>
                        ) : (
                            <div className="flex flex-col items-center justify-center h-full text-slate-700 gap-4">
                                <Bug className="w-16 h-16 opacity-20" />
                                <p>Select a crash log to inspect stack trace.</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Right: Diagnostics */}
                {analysis && (
                    <div className="w-80 bg-[#140a0a] border-l border-red-900/20 flex flex-col animate-slide-in-right">
                        <div className="p-4 border-b border-red-900/20 bg-red-900/10">
                            <h3 className="text-sm font-bold text-red-400 uppercase tracking-widest flex items-center gap-2">
                                <Activity className="w-4 h-4" /> Diagnostic Report
                            </h3>
                        </div>
                        
                        <div className="flex-1 p-6 space-y-6 overflow-y-auto">
                            {/* Culprit Card */}
                            <div className="bg-black/40 rounded-xl p-4 border border-red-500/30 relative overflow-hidden">
                                <div className="absolute top-0 right-0 p-2 opacity-10">
                                    <AlertTriangle className="w-12 h-12 text-red-500" />
                                </div>
                                <div className="text-[10px] text-red-400 font-bold uppercase mb-1">Likely Culprit</div>
                                <div className="text-lg font-bold text-white break-words">{analysis.culprit}</div>
                                <div className="mt-2 flex items-center gap-2 text-xs">
                                    <span className="text-slate-500">Confidence:</span>
                                    <span className={`px-2 py-0.5 rounded font-bold ${
                                        analysis.confidence === 'High' ? 'bg-red-500 text-white' : 'bg-yellow-500 text-black'
                                    }`}>{analysis.confidence}</span>
                                </div>
                            </div>

                            {/* Stack Signatures */}
                            {analysis.key_signatures && analysis.key_signatures.length > 0 && (
                                <div>
                                    <h4 className="text-xs font-bold text-slate-500 uppercase mb-2 flex items-center gap-2">
                                        <Code className="w-3 h-3" /> Key Signatures
                                    </h4>
                                    <div className="space-y-1">
                                        {analysis.key_signatures.map((sig, i) => (
                                            <div key={i} className="text-[10px] font-mono text-red-300 bg-red-900/10 border border-red-900/30 px-2 py-1 rounded truncate">
                                                {sig}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Reason */}
                            <div>
                                <h4 className="text-xs font-bold text-slate-500 uppercase mb-2 flex items-center gap-2">
                                    <Search className="w-3 h-3" /> Root Cause
                                </h4>
                                <p className="text-sm text-slate-300 bg-slate-900/50 p-3 rounded-lg border border-slate-800 leading-relaxed">
                                    {analysis.reason}
                                </p>
                            </div>

                            {/* Solution */}
                            <div>
                                <h4 className="text-xs font-bold text-slate-500 uppercase mb-2 flex items-center gap-2">
                                    <CheckCircle2 className="w-3 h-3" /> Recommended Action
                                </h4>
                                <div className="text-sm text-green-300 bg-green-900/10 p-3 rounded-lg border border-green-500/30 flex items-start gap-3">
                                    <ArrowRight className="w-4 h-4 mt-0.5 shrink-0" />
                                    {analysis.fix}
                                </div>
                            </div>

                            <div className="pt-4 border-t border-red-900/20">
                                <button className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded flex items-center justify-center gap-2 transition-colors">
                                    <Cpu className="w-3 h-3" /> Open in Organizer
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default TheCrucible;