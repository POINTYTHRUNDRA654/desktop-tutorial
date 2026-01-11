import React, { useState, useEffect, useRef } from 'react';
import { GoogleGenAI } from "@google/genai";
import { Terminal, Play, AlertTriangle, ShieldCheck, Save, Trash2, Command, ChevronRight, Activity, Cpu, Wifi } from 'lucide-react';

interface TerminalLine {
  id: string;
  type: 'input' | 'output' | 'info' | 'error' | 'success';
  content: string;
}

interface PendingCommand {
  cmd: string;
  explanation: string;
  risk: 'Low' | 'Medium' | 'High';
}

const HyperTerminal: React.FC = () => {
  const [input, setInput] = useState('');
  const [history, setHistory] = useState<TerminalLine[]>([
      { id: 'init-1', type: 'info', content: 'HyperTerminal v1.0.4 initialized.' },
      { id: 'init-2', type: 'info', content: 'Connection to Desktop Bridge: ACTIVE' },
      { id: 'init-3', type: 'output', content: 'System ready. Waiting for instructions...' },
  ]);
  const [pendingCmd, setPendingCmd] = useState<PendingCommand | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [history, pendingCmd]);

  // Focus input on mount/click
  const focusInput = () => inputRef.current?.focus();

  const handleTranslate = async () => {
      if (!input.trim()) return;
      setIsProcessing(true);
      
      // Add user input to history
      setHistory(prev => [...prev, { id: Date.now().toString(), type: 'input', content: input }]);

      try {
          const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
          const response = await ai.models.generateContent({
              model: 'gemini-3-flash-preview',
              contents: `Translate this natural language request into a Windows PowerShell command: "${input}".
              Return JSON: { "command": string, "explanation": string, "risk": "Low"|"Medium"|"High" }.
              If the request is unsafe or malicious, set risk to High and explanation to warning.`,
              config: { responseMimeType: 'application/json' }
          });
          
          const result = JSON.parse(response.text);
          setPendingCmd({
              cmd: result.command,
              explanation: result.explanation,
              risk: result.risk
          });
          setInput('');

      } catch (e) {
          setHistory(prev => [...prev, { id: Date.now().toString(), type: 'error', content: 'Translation Failed: AI Service Unreachable.' }]);
      } finally {
          setIsProcessing(false);
      }
  };

  const handleExecute = () => {
      if (!pendingCmd) return;
      setIsExecuting(true);
      setHistory(prev => [...prev, { id: Date.now().toString(), type: 'info', content: `> ${pendingCmd.cmd}` }]);
      
      // Simulation of execution via Bridge
      setTimeout(() => {
          // Mock output based on command heuristics
          let output = "Command executed successfully.";
          if (pendingCmd.cmd.includes("Get-ChildItem")) output = `    Directory: D:\\Assets\n\nMode                 LastWriteTime         Length Name\n----                 -------------         ------ ----\n-a----        10/24/2024   2:14 PM           1024 config.json\n-a----        10/25/2024   4:20 PM        2048512 texture_diff.dds`;
          if (pendingCmd.cmd.includes("ipconfig")) output = "IPv4 Address. . . . . . . . . . . : 192.168.1.42";
          
          setHistory(prev => [...prev, { id: Date.now().toString(), type: 'success', content: output }]);
          setPendingCmd(null);
          setIsExecuting(false);
      }, 1000);
  };

  const handleCancel = () => {
      setHistory(prev => [...prev, { id: Date.now().toString(), type: 'error', content: 'Execution cancelled by user.' }]);
      setPendingCmd(null);
  };

  const saveToVault = () => {
      if (!pendingCmd) return;
      setHistory(prev => [...prev, { id: Date.now().toString(), type: 'success', content: `Script saved to Vault: script_${Date.now()}.ps1` }]);
  };

  return (
    <div className="h-full flex flex-col bg-black text-green-400 font-mono overflow-hidden relative" onClick={focusInput}>
        {/* CRT Overlay Effects */}
        <div className="absolute inset-0 pointer-events-none z-20 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.1)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_4px,3px_100%]"></div>
        <div className="absolute inset-0 pointer-events-none z-10 opacity-10 bg-repeat animate-scanline" style={{backgroundImage: 'url("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAYAAABytg0kAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAABZJREFUeNpi2r9//38gYGAEESAAEGAAasgJOgzOKCoAAAAASUVORK5CYII=")'}}></div>

        {/* Header */}
        <div className="p-4 border-b border-green-900/50 flex justify-between items-center bg-green-900/10 z-30">
            <div className="flex items-center gap-3">
                <Terminal className="w-5 h-5 text-green-500" />
                <h2 className="text-lg font-bold tracking-widest text-green-500">HYPER_TERMINAL</h2>
                <div className="text-[10px] bg-green-900/30 px-2 py-0.5 rounded text-green-400 border border-green-800">
                    BRIDGE: ONLINE
                </div>
            </div>
            <div className="flex gap-4 text-xs text-green-600">
                <div className="flex items-center gap-1"><Cpu className="w-3 h-3" /> CPU: 12%</div>
                <div className="flex items-center gap-1"><Activity className="w-3 h-3" /> RAM: 4.2GB</div>
            </div>
        </div>

        {/* Main Terminal Output */}
        <div className="flex-1 overflow-y-auto p-6 space-y-2 z-30 custom-scrollbar">
            {history.map(line => (
                <div key={line.id} className={`flex gap-2 ${
                    line.type === 'error' ? 'text-red-400' :
                    line.type === 'success' ? 'text-emerald-300' :
                    line.type === 'input' ? 'text-white' :
                    line.type === 'info' ? 'text-green-600' :
                    'text-green-400'
                }`}>
                    <span className="opacity-50 select-none">
                        {line.type === 'input' ? '>' : 
                         line.type === 'output' ? ' ' :
                         line.type === 'info' ? 'i' :
                         line.type === 'error' ? '!' : '#'}
                    </span>
                    <span className="whitespace-pre-wrap">{line.content}</span>
                </div>
            ))}
            
            {/* Pending Command Approval Card */}
            {pendingCmd && (
                <div className="my-4 p-4 bg-slate-900/80 border border-slate-600 rounded-lg max-w-2xl animate-fade-in shadow-[0_0_30px_rgba(0,0,0,0.5)] relative overflow-hidden group">
                     {/* Risk Stripe */}
                     <div className={`absolute top-0 left-0 w-1 h-full ${
                         pendingCmd.risk === 'High' ? 'bg-red-500' : 
                         pendingCmd.risk === 'Medium' ? 'bg-yellow-500' : 'bg-blue-500'
                     }`}></div>

                     <div className="flex justify-between items-start mb-3 pl-3">
                         <h3 className="text-slate-200 font-bold flex items-center gap-2">
                             <Command className="w-4 h-4 text-forge-accent" /> Generated Protocol
                         </h3>
                         <div className={`text-xs px-2 py-1 rounded border font-bold ${
                             pendingCmd.risk === 'High' ? 'border-red-500 text-red-500 bg-red-900/20' : 
                             pendingCmd.risk === 'Medium' ? 'border-yellow-500 text-yellow-500 bg-yellow-900/20' : 'border-blue-500 text-blue-500 bg-blue-900/20'
                         }`}>
                             RISK: {pendingCmd.risk.toUpperCase()}
                         </div>
                     </div>

                     <div className="bg-black p-3 rounded border border-slate-700 font-mono text-sm text-yellow-300 mb-3 pl-3 overflow-x-auto">
                         {pendingCmd.cmd}
                     </div>

                     <div className="text-slate-400 text-xs mb-4 pl-3 italic border-l-2 border-slate-700 py-1">
                         "{pendingCmd.explanation}"
                     </div>

                     <div className="flex gap-2 pl-3">
                         <button 
                             onClick={handleExecute}
                             disabled={isExecuting}
                             className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded font-bold text-xs transition-colors"
                         >
                             {isExecuting ? <Activity className="w-3 h-3 animate-spin" /> : <Play className="w-3 h-3 fill-current" />}
                             EXECUTE
                         </button>
                         <button 
                             onClick={saveToVault}
                             className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded font-bold text-xs transition-colors"
                         >
                             <Save className="w-3 h-3" /> SAVE SCRIPT
                         </button>
                         <button 
                             onClick={handleCancel}
                             className="flex items-center gap-2 px-4 py-2 bg-transparent hover:bg-red-900/30 text-red-400 hover:text-red-300 border border-transparent hover:border-red-900 rounded font-bold text-xs transition-colors ml-auto"
                         >
                             <Trash2 className="w-3 h-3" /> DISCARD
                         </button>
                     </div>
                </div>
            )}

            {isProcessing && (
                <div className="flex items-center gap-2 text-green-600 animate-pulse">
                    <Activity className="w-4 h-4 animate-spin" /> Translating logic matrix...
                </div>
            )}
            
            <div ref={bottomRef} />
        </div>

        {/* Input Area */}
        <div className="p-4 bg-black border-t border-green-900 z-30">
            <div className="flex items-center gap-2 max-w-4xl">
                <ChevronRight className="w-5 h-5 text-green-500 animate-pulse" />
                <input 
                    ref={inputRef}
                    type="text" 
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleTranslate()}
                    className="flex-1 bg-transparent border-none focus:ring-0 text-green-100 placeholder-green-900 font-mono text-lg"
                    placeholder="Enter natural language command..."
                    autoFocus
                />
            </div>
            <div className="text-[10px] text-green-800 mt-2 pl-7 flex gap-4">
                 <span>TIP: "Find large video files in D:/"</span>
                 <span>|</span>
                 <span>"Backup my Fallout 4 saves"</span>
                 <span>|</span>
                 <span>"Check current IP address"</span>
            </div>
        </div>
    </div>
  );
};

export default HyperTerminal;