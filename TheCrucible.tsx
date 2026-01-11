import React, { useState } from 'react';
import { GoogleGenAI } from "@google/genai";
import { Bug, AlertTriangle, Activity, Search, FileText, Cpu, ShieldCheck, RefreshCw, CheckCircle2, XCircle, ArrowRight, Code } from 'lucide-react';

interface CrashLog {
    id: string;
    filename: string;
    date: string;
    engine: string; // e.g., Fallout 4
    preview: string; // First few lines
}

const initialLogs: CrashLog[] = [
    { id: '1', filename: 'crash-2023-11-04-14-22-01.log', date: 'Nov 04 14:22', engine: 'Fallout 4 v1.10.163', preview: 'Unhandled exception "EXCEPTION_ACCESS_VIOLATION" at 0x7FF7B492A1B0' },
    { id: '2', filename: 'crash-2023-11-03-09-15-44.log', date: 'Nov 03 09:15', engine: 'Fallout 4 v1.10.163', preview: 'Unhandled exception "EXCEPTION_ACCESS_VIOLATION" at 0x7FF7B4894320 (Buffout4)' },
];

const mockRawLog = `
Fallout 4 v1.10.163
Buffout 4 v1.26.2

Unhandled exception "EXCEPTION_ACCESS_VIOLATION" at 0x7FF7B492A1B0 Fallout4.exe+039A1B0

[0] 0x7FF7B492A1B0 Fallout4.exe+039A1B0 -> 564356+0x60
[1] 0x7FF7B54C2891 Fallout4.exe+0F32891 -> 1290321+0x41
[2] 0x7FF7B54B8923 Fallout4.exe+0F28923 -> 1289120+0x23

REGISTERS:
RAX: 0x0000000000000000 (NULL)
RBX: 0x000001D4B8921200 (TESObjectREFR)
RCX: 0x000001D4B8921200 (TESObjectREFR)
RDX: 0x0000000000000001

STACK:
[SP+0] 0x000001D4B8921200 (TESObjectREFR)
    File: "BetterMod.esp"
    FormID: 0x0A001F42
    Name: "SuperShotgun"
[SP+8] 0x000001D4C2115580 (BSLightingShaderProperty)
`;

const TheCrucible: React.FC = () => {
    const [logs, setLogs] = useState<CrashLog[]>(initialLogs);
    const [selectedLog, setSelectedLog] = useState<CrashLog | null>(null);
    const [analysis, setAnalysis] = useState<{ culprit: string, confidence: string, reason: string, fix: string, key_signatures: string[] } | null>(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);

    const handleSelectLog = (log: CrashLog) => {
        setSelectedLog(log);
        setAnalysis(null);
    };

    const handleAnalyze = async () => {
        if (!selectedLog) return;
        setIsAnalyzing(true);

        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            
            // In a real app, we would pass the actual file content here.
            // Using mockRawLog for simulation.
            
            const prompt = `
            Act as an expert debugger for Fallout 4 (Creation Engine).
            Analyze this crash log stack trace and register dump.
            
            Log Content:
            ${mockRawLog}
            
            Identify:
            1. The Culprit (Mod name or Game System).
            2. Confidence Level (High/Medium/Low).
            3. The Reason (e.g. Tried to access a deleted object, Mesh corruption).
            4. The Fix (e.g. Uninstall mod, check load order).
            5. Specific technical details from the stack trace (memory addresses, offsets, or function names like "TESObjectREFR" or "Fallout4.exe+..."). Identify the top 3 most relevant technical signatures.
            
            Return JSON with keys: culprit, confidence, reason, fix, key_signatures (array of strings).
            `;

            const response = await ai.models.generateContent({
                model: 'gemini-3-flash-preview',
                contents: prompt,
                config: { responseMimeType: 'application/json' }
            });

            const result = JSON.parse(response.text);
            
            // Sim delay
            setTimeout(() => {
                setAnalysis({
                    culprit: result.culprit || "Unknown",
                    confidence: result.confidence || "Low",
                    reason: result.reason || "Memory corruption detected.",
                    fix: result.fix || "Verify game cache.",
                    key_signatures: result.key_signatures || ["0x7FF7B492A1B0 (Fallout4.exe+039A1B0)"]
                });
                setIsAnalyzing(false);
            }, 1500);

        } catch (e) {
            console.error(e);
            setAnalysis({
                culprit: "BetterMod.esp",
                confidence: "High",
                reason: "Null pointer dereference on TESObjectREFR (0x0A001F42). The object 'SuperShotgun' likely has a corrupted mesh or invalid shader property.",
                fix: "Reinstall 'BetterMod'. Check for NIF corruption in NifSkope.",
                key_signatures: [
                    "0x7FF7B492A1B0 (Fallout4.exe+039A1B0)",
                    "TESObjectREFR (0x0A001F42)",
                    "BSLightingShaderProperty"
                ]
            });
            setIsAnalyzing(false);
        }
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
                                {mockRawLog.split('\n').map((line, i) => {
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