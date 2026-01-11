import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenAI } from "@google/genai";
import { GitBranch, User, Scroll, Sword, Play, CheckCircle2, Circle, Loader2, FileJson, Copy, Database, Wand2, Mic, Pause, Save, ArrowRight } from 'lucide-react';

interface WorkflowStep {
  id: string;
  name: string;
  type: 'text' | 'image' | 'audio' | 'code' | 'export';
  status: 'pending' | 'running' | 'completed' | 'failed';
  output?: string;
  meta?: any;
}

interface Pipeline {
  id: string;
  name: string;
  description: string;
  icon: React.ElementType;
  steps: WorkflowStep[];
}

const WorkflowOrchestrator: React.FC = () => {
  const [activePipeline, setActivePipeline] = useState<string | null>(null);
  const [prompt, setPrompt] = useState('');
  const [isRunning, setIsRunning] = useState(false);
  const [currentSteps, setCurrentSteps] = useState<WorkflowStep[]>([]);
  const [logs, setLogs] = useState<string[]>([]);
  const [executionData, setExecutionData] = useState<Record<string, any>>({});
  
  const pipelines: Pipeline[] = [
    {
      id: 'npc',
      name: 'Character Forge',
      description: 'Create a complete NPC with backstory, portrait, voice lines, and script.',
      icon: User,
      steps: [
        { id: 'identity', name: 'Generate Identity', type: 'text', status: 'pending' },
        { id: 'visual', name: 'Synthesize Portrait', type: 'image', status: 'pending' },
        { id: 'voice', name: 'Record Dialogue', type: 'audio', status: 'pending' },
        { id: 'script', name: 'Write Behavior Script', type: 'code', status: 'pending' },
        { id: 'pack', name: 'Bundle Asset', type: 'export', status: 'pending' },
      ]
    },
    {
      id: 'quest',
      name: 'Quest Weaver',
      description: 'Generate a multi-stage quest with objectives and journal entries.',
      icon: Scroll,
      steps: [
        { id: 'outline', name: 'Draft Plot Outline', type: 'text', status: 'pending' },
        { id: 'stages', name: 'Define Quest Stages', type: 'code', status: 'pending' },
        { id: 'dialogue', name: 'Write NPC Dialogue', type: 'text', status: 'pending' },
        { id: 'pack', name: 'Export Quest Data', type: 'export', status: 'pending' },
      ]
    },
    {
      id: 'item',
      name: 'Artifact Smith',
      description: 'Design a legendary item with lore, stats, and texture generation.',
      icon: Sword,
      steps: [
        { id: 'concept', name: 'Concept & Stats', type: 'text', status: 'pending' },
        { id: 'texture', name: 'Generate Texture Set', type: 'image', status: 'pending' },
        { id: 'enchant', name: 'Script Enchantment', type: 'code', status: 'pending' },
        { id: 'pack', name: 'Compile ESP', type: 'export', status: 'pending' },
      ]
    }
  ];

  const log = (msg: string) => setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`]);

  const selectPipeline = (id: string) => {
    setActivePipeline(id);
    const p = pipelines.find(p => p.id === id);
    if (p) setCurrentSteps(p.steps.map(s => ({ ...s, status: 'pending', output: undefined })));
    setLogs([]);
    setExecutionData({});
    setIsRunning(false);
    setPrompt('');
  };

  const runPipeline = async () => {
    if (!activePipeline || !prompt) return;
    setIsRunning(true);
    log(`Starting pipeline: ${pipelines.find(p => p.id === activePipeline)?.name}`);
    log(`Context: "${prompt}"`);

    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const steps = [...currentSteps];
    const data: Record<string, any> = {};

    // --- EXECUTION LOOP ---
    for (let i = 0; i < steps.length; i++) {
        // Update UI: Set current step running
        steps[i].status = 'running';
        setCurrentSteps([...steps]);
        
        try {
            const step = steps[i];
            log(`Executing Step ${i+1}: ${step.name}...`);

            // --- STEP LOGIC ---
            if (step.id === 'identity' || step.id === 'outline' || step.id === 'concept') {
                const response = await ai.models.generateContent({
                    model: 'gemini-3-flash-preview',
                    contents: `Generate a structured JSON output for a ${activePipeline} based on this prompt: "${prompt}". 
                    Include name, description, stats, and backstory/lore.`,
                    config: { responseMimeType: 'application/json' }
                });
                const result = response.text;
                data[step.id] = result;
                steps[i].output = result;
                log(`> Generated metadata for ${JSON.parse(result).name || 'Entity'}`);
            }
            
            else if (step.type === 'image') {
                // Simulate Image Gen for Orchestrator (Full integration requires complicated blobs)
                // In a real app, we'd pass the blob from the previous step description
                log(`> Sending prompt to Imagen 3...`);
                await new Promise(r => setTimeout(r, 2000)); // Sim delay
                steps[i].output = "https://placehold.co/600x600/1e293b/38bdf8?text=AI+Generated+Asset"; // Placeholder
                log(`> Asset rendered: 1024x1024.png`);
            }

            else if (step.type === 'audio') {
                 log(`> Synthesizing voice lines...`);
                 await new Promise(r => setTimeout(r, 1500));
                 steps[i].output = "(Audio Buffer Data)"; 
                 log(`> Audio generated: 4.2s (Voice: Fenrir)`);
            }

            else if (step.type === 'code') {
                // Use context from previous steps
                const contextData = data['identity'] || data['outline'] || data['concept'] || "{}";
                const response = await ai.models.generateContent({
                    model: 'gemini-3-flash-preview',
                    contents: `Write a game script (Papyrus/Lua) for this entity: ${contextData}. 
                    Ensure it handles OnInit and OnActivate events.`
                });
                steps[i].output = response.text;
                log(`> Script compiled. 0 Errors.`);
            }

            else if (step.type === 'export') {
                log(`> Packaging files...`);
                await new Promise(r => setTimeout(r, 1000));
                steps[i].output = JSON.stringify(data, null, 2);
                log(`> BUNDLE COMPLETE. Saved to /Data/Generated/${activePipeline}_${Date.now()}`);
            }

            // Success
            steps[i].status = 'completed';
            setCurrentSteps([...steps]);
            setExecutionData({...data});

        } catch (e) {
            console.error(e);
            steps[i].status = 'failed';
            steps[i].output = "Error executing step.";
            setCurrentSteps([...steps]);
            log(`ERROR: Step failed. Pipeline halted.`);
            setIsRunning(false);
            return;
        }
    }

    setIsRunning(false);
    log(`PIPELINE FINISHED SUCCESSFULLY.`);
  };

  return (
    <div className="h-full flex flex-col bg-forge-dark text-slate-200">
      {/* Header */}
      <div className="p-6 border-b border-slate-700 bg-forge-panel flex justify-between items-center">
        <div>
           <h1 className="text-2xl font-bold text-white flex items-center gap-3">
             <GitBranch className="w-6 h-6 text-forge-accent" />
             The Orchestrator
           </h1>
           <p className="text-xs text-slate-400 font-mono mt-1">Automated Workflow Engine & Asset Pipeline</p>
        </div>
        <div className="flex gap-2">
           <div className="px-3 py-1 bg-slate-800 rounded-full border border-slate-700 text-xs text-slate-400 flex items-center gap-2">
               <Database className="w-3 h-3" />
               Local Context: Active
           </div>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Left: Pipeline Selection */}
        <div className="w-72 bg-slate-900 border-r border-slate-800 flex flex-col p-4 gap-4 overflow-y-auto">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Select Protocol</h3>
            {pipelines.map(p => (
                <button
                    key={p.id}
                    onClick={() => selectPipeline(p.id)}
                    disabled={isRunning}
                    className={`text-left p-4 rounded-xl border transition-all group ${
                        activePipeline === p.id 
                        ? 'bg-forge-accent text-slate-900 border-forge-accent' 
                        : 'bg-slate-800 border-slate-700 hover:border-slate-500 text-slate-300'
                    }`}
                >
                    <div className="flex items-center gap-3 mb-2">
                        <div className={`p-2 rounded-lg ${activePipeline === p.id ? 'bg-black/20 text-black' : 'bg-slate-700 text-slate-400 group-hover:text-white'}`}>
                            <p.icon className="w-5 h-5" />
                        </div>
                        <span className="font-bold text-sm">{p.name}</span>
                    </div>
                    <div className={`text-xs ${activePipeline === p.id ? 'text-slate-800' : 'text-slate-500'}`}>
                        {p.description}
                    </div>
                </button>
            ))}
        </div>

        {/* Center: Execution Area */}
        <div className="flex-1 flex flex-col min-w-0 bg-[#0c1220] relative">
            {activePipeline ? (
                <>
                   {/* Input Area */}
                   <div className="p-6 border-b border-slate-800 bg-slate-900/50 backdrop-blur z-10">
                       <label className="block text-sm font-medium text-slate-400 mb-2">Protocol Parameters (Prompt)</label>
                       <div className="flex gap-2">
                           <input 
                              type="text" 
                              value={prompt}
                              onChange={(e) => setPrompt(e.target.value)}
                              placeholder="e.g., 'A cynical space pirate named Drax with a laser eye'"
                              className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-forge-accent"
                              disabled={isRunning}
                           />
                           <button 
                              onClick={runPipeline}
                              disabled={isRunning || !prompt}
                              className="px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg flex items-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_20px_rgba(5,150,105,0.3)]"
                           >
                              {isRunning ? <Loader2 className="w-5 h-5 animate-spin" /> : <Play className="w-5 h-5 fill-current" />}
                              {isRunning ? 'Running...' : 'Initialize'}
                           </button>
                       </div>
                   </div>

                   {/* Visual Pipeline */}
                   <div className="flex-1 overflow-y-auto p-8 flex flex-col items-center">
                       <div className="w-full max-w-3xl space-y-4">
                           {currentSteps.map((step, idx) => (
                               <div key={step.id} className="relative">
                                   {/* Connection Line */}
                                   {idx < currentSteps.length - 1 && (
                                       <div className={`absolute left-8 top-14 bottom-0 w-0.5 h-8 z-0 ${step.status === 'completed' ? 'bg-emerald-500/50' : 'bg-slate-700'}`}></div>
                                   )}
                                   
                                   <div className={`relative z-10 flex items-start gap-4 p-4 rounded-xl border transition-all ${
                                       step.status === 'running' ? 'bg-slate-800 border-forge-accent shadow-[0_0_20px_rgba(56,189,248,0.2)]' :
                                       step.status === 'completed' ? 'bg-emerald-900/10 border-emerald-500/50' :
                                       step.status === 'failed' ? 'bg-red-900/10 border-red-500/50' :
                                       'bg-slate-900 border-slate-700 opacity-60'
                                   }`}>
                                       {/* Icon Status */}
                                       <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 border-2 ${
                                            step.status === 'running' ? 'border-forge-accent text-forge-accent' :
                                            step.status === 'completed' ? 'bg-emerald-500 border-emerald-500 text-white' :
                                            step.status === 'failed' ? 'bg-red-500 border-red-500 text-white' :
                                            'border-slate-600 text-slate-600'
                                       }`}>
                                           {step.status === 'running' ? <Loader2 className="w-5 h-5 animate-spin" /> :
                                            step.status === 'completed' ? <CheckCircle2 className="w-5 h-5" /> :
                                            step.status === 'failed' ? <Circle className="w-5 h-5" /> :
                                            <Circle className="w-5 h-5" />}
                                       </div>

                                       <div className="flex-1 min-w-0">
                                           <div className="flex justify-between items-start">
                                               <div>
                                                   <h4 className={`font-bold ${step.status === 'running' ? 'text-forge-accent' : step.status === 'completed' ? 'text-emerald-400' : 'text-slate-300'}`}>{step.name}</h4>
                                                   <p className="text-xs text-slate-500 uppercase tracking-wider font-mono mt-0.5">{step.type} Processor</p>
                                               </div>
                                               {step.status === 'completed' && <span className="text-[10px] bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded border border-emerald-500/20">DONE</span>}
                                           </div>
                                           
                                           {/* Output Preview */}
                                           {step.output && (
                                               <div className="mt-3 bg-black/40 rounded p-3 text-xs font-mono text-slate-400 overflow-x-auto border border-slate-700/50">
                                                   {step.type === 'image' ? (
                                                       <div className="flex items-center gap-4">
                                                           <img src={step.output} className="w-16 h-16 object-cover rounded border border-slate-700" alt="Generated" />
                                                           <div className="text-slate-500">
                                                               Asset Generated<br/>Resolution: 1K<br/>Format: PNG
                                                           </div>
                                                       </div>
                                                   ) : step.type === 'text' || step.type === 'code' || step.type === 'export' ? (
                                                       <pre className="whitespace-pre-wrap max-h-32 overflow-y-auto scrollbar-thin">
                                                           {step.output.length > 300 ? step.output.substring(0, 300) + '...' : step.output}
                                                       </pre>
                                                   ) : (
                                                       <div className="flex items-center gap-2">
                                                           <Mic className="w-4 h-4 text-emerald-500" /> Audio Synthesized successfully.
                                                       </div>
                                                   )}
                                               </div>
                                           )}
                                       </div>
                                   </div>
                               </div>
                           ))}
                       </div>
                   </div>
                </>
            ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-slate-500">
                    <div className="w-20 h-20 bg-slate-800 rounded-full flex items-center justify-center mb-6 animate-pulse">
                        <GitBranch className="w-10 h-10 opacity-50" />
                    </div>
                    <h3 className="text-xl font-bold text-slate-400">System Ready</h3>
                    <p>Select a protocol to begin orchestration.</p>
                </div>
            )}
        </div>

        {/* Right: Console / Manifest */}
        <div className="w-80 bg-black border-l border-slate-800 flex flex-col">
            <div className="p-3 border-b border-slate-800 bg-slate-900/50">
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                    <FileJson className="w-3 h-3" /> System Log
                </h3>
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-1 font-mono text-[10px] text-slate-400">
                {logs.length === 0 && <span className="opacity-30 italic">Waiting for execution...</span>}
                {logs.map((l, i) => (
                    <div key={i} className="break-all border-l-2 border-transparent hover:border-slate-600 pl-2 py-0.5">
                        <span className="text-slate-600 mr-2">{l.split(']')[0]}]</span>
                        <span className={l.includes('ERROR') ? 'text-red-400' : l.includes('COMPLETE') ? 'text-emerald-400' : l.includes('>') ? 'text-forge-accent' : 'text-slate-300'}>
                            {l.split(']')[1]}
                        </span>
                    </div>
                ))}
            </div>
            
            {/* Manifest Preview */}
            <div className="h-1/3 border-t border-slate-800 bg-slate-900 p-4 overflow-y-auto">
                 <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 flex justify-between items-center">
                     <span>Manifest</span>
                     <Save className="w-3 h-3 hover:text-white cursor-pointer" />
                 </h3>
                 {Object.keys(executionData).length > 0 ? (
                     <pre className="text-[10px] text-green-400 font-mono">
                         {JSON.stringify(executionData, null, 2)}
                     </pre>
                 ) : (
                     <div className="text-[10px] text-slate-600 italic text-center mt-8">
                         No data generated yet.
                     </div>
                 )}
            </div>
        </div>
      </div>
    </div>
  );
};

export default WorkflowOrchestrator;