
import React, { useState, useEffect, useRef } from 'react';
import { LiveAssistant } from './components/LiveAssistant';
import { ResearchAssistant } from './components/ResearchAssistant';
import { SystemOptimizer } from './components/SystemOptimizer';
import { ChatBot } from './components/ChatBot';
import { ImageStudio } from './components/ImageStudio';
import { VisionAnalyzer } from './components/VisionAnalyzer';
import { BlenderIntegrator } from './components/BlenderIntegrator';
import { DiscordBotGenerator } from './components/DiscordBotGenerator';
import { SoftwareAuditor } from './components/SoftwareAuditor';
import { ModIntegrator } from './components/ModIntegrator';
import { TextureTools } from './components/TextureTools';
import { RTXRemixAssistant } from './components/RTXRemixAssistant';
import { NifTools } from './components/NifTools';
import { GimpAssistant } from './components/GimpAssistant';
import { ShaderMapAssistant } from './components/ShaderMapAssistant';
import { PhotopeaAssistant } from './components/PhotopeaAssistant';
import { UpscaylAssistant } from './components/UpscaylAssistant';
import { MaterializeAssistant } from './components/MaterializeAssistant';
import { ModdingMasterGuide } from './components/ModdingMasterGuide';
import { Fallout4Architect } from './components/Fallout4Architect';
import { AppMode, SoftwareContext, LogEntry } from './types';

// Component to render individual log entries with interactive features
const LogEntryItem: React.FC<{ log: LogEntry }> = ({ log }) => {
  const [showSources, setShowSources] = useState(false);
  
  const isUser = log.sender === 'user';
  const isSystem = log.sender === 'system';
  
  const bubbleClass = isUser 
    ? 'bg-blue-900/20 border border-blue-800 text-blue-200' 
    : isSystem
      ? 'bg-yellow-900/10 border border-yellow-900/50 text-yellow-500'
      : 'bg-slate-800 border border-slate-700 text-slate-200';

  const hasSources = log.type === 'search-result' && log.metadata?.chunks?.length > 0;
  const isImage = log.type === 'image';

  return (
    <div className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} animate-in slide-in-from-bottom-2 fade-in duration-300`}>
       <span className="text-[10px] text-slate-600 mb-1 font-mono">{log.timestamp} - {log.sender.toUpperCase()}</span>
       <div className={`p-3 rounded-lg max-w-[95%] md:max-w-[90%] break-words shadow-sm ${bubbleClass}`}>
         
         {/* Content */}
         {log.type === 'code' ? (
           <pre className="whitespace-pre-wrap overflow-x-auto text-xs font-mono bg-black/50 p-2 rounded border border-slate-700 mt-1">
             {log.message}
           </pre>
         ) : isImage ? (
           <div className="mt-1">
             <div className="text-sm mb-2">{log.message}</div>
           </div>
         ) : (
           <div className="text-sm leading-relaxed whitespace-pre-wrap">
             {log.message}
           </div>
         )}

         {/* Collapsible Sources for Search Results */}
         {hasSources && (
           <div className="mt-3 pt-2 border-t border-slate-700/50">
             <button 
               onClick={() => setShowSources(!showSources)}
               className="flex items-center gap-2 text-xs font-bold text-blue-400 hover:text-blue-300 transition-colors w-full focus:outline-none group"
             >
               <svg 
                 xmlns="http://www.w3.org/2000/svg" 
                 className={`h-4 w-4 transition-transform duration-200 ${showSources ? 'rotate-90' : ''}`} 
                 fill="none" 
                 viewBox="0 0 24 24" 
                 stroke="currentColor"
               >
                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
               </svg>
               <span>{showSources ? 'Hide Sources' : `View Verified Sources (${log.metadata.chunks.length})`}</span>
             </button>
             
             {showSources && (
               <div className="mt-2 pl-1 space-y-2">
                 {log.metadata.chunks.map((chunk: any, i: number) => (
                    chunk.web?.uri ? (
                      <a 
                        key={i} 
                        href={chunk.web.uri} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="flex items-start gap-2 p-2 rounded bg-slate-900/50 hover:bg-slate-900 border border-slate-700/50 hover:border-blue-500/30 transition-all group/link"
                      >
                        <div className="mt-0.5 min-w-[16px]">
                           <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-slate-500 group-hover/link:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                           </svg>
                        </div>
                        <div className="overflow-hidden">
                           <div className="text-xs font-medium text-blue-300 truncate group-hover/link:text-blue-200">
                             {chunk.web.title || "External Source"}
                           </div>
                           <div className="text-[10px] text-slate-500 truncate font-mono">
                             {chunk.web.uri}
                           </div>
                        </div>
                      </a>
                    ) : null
                 ))}
               </div>
             )}
           </div>
         )}
       </div>
    </div>
  );
};

const App: React.FC = () => {
  const [mode, setMode] = useState<AppMode>(AppMode.LIVE_ASSIST);
  const [context, setContext] = useState<SoftwareContext>(SoftwareContext.GENERAL);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  const addLog = (message: string, sender: 'user' | 'ai' | 'system', type: 'text' | 'code' | 'search-result' | 'image' = 'text', metadata?: any) => {
    setLogs(prev => [...prev, {
      timestamp: new Date().toLocaleTimeString(),
      sender,
      message,
      type,
      metadata
    }]);
  };

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs]);

  return (
    <div className="min-h-screen bg-[#020617] text-slate-200 flex flex-col md:flex-row overflow-hidden">
      {/* Sidebar / Navigation */}
      <aside className="w-full md:w-64 bg-slate-900 border-r border-slate-800 flex flex-col z-10 overflow-y-auto">
        <div className="p-6 border-b border-slate-800">
          <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-mod-green to-blue-500">
            NEXUS ARCHITECT
          </h1>
          <p className="text-xs text-slate-500 mt-1">AI Modding Companion</p>
        </div>

        <nav className="flex-1 p-4 space-y-6">
          
          {/* COMMUNICATION */}
          <div>
              <div className="text-xs font-bold text-slate-600 px-4 mb-2 uppercase tracking-wider flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-mod-green"></span>
                  Communication
              </div>
              <div className="space-y-1">
                  <button onClick={() => setMode(AppMode.LIVE_ASSIST)} className={`w-full text-left px-4 py-2 rounded-lg flex items-center gap-3 text-sm transition-all ${mode === AppMode.LIVE_ASSIST ? 'bg-mod-green/10 text-mod-green border border-mod-green/50' : 'text-slate-400 hover:bg-slate-800'}`}>
                    <span className="w-4">🎤</span> Live Voice
                  </button>
                  <button onClick={() => setMode(AppMode.CHAT_BOT)} className={`w-full text-left px-4 py-2 rounded-lg flex items-center gap-3 text-sm transition-all ${mode === AppMode.CHAT_BOT ? 'bg-purple-500/10 text-purple-400 border border-purple-500/50' : 'text-slate-400 hover:bg-slate-800'}`}>
                    <span className="w-4">💬</span> AI Chat
                  </button>
                  <button onClick={() => setMode(AppMode.DISCORD_BOT_GEN)} className={`w-full text-left px-4 py-2 rounded-lg flex items-center gap-3 text-sm transition-all ${mode === AppMode.DISCORD_BOT_GEN ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/50' : 'text-slate-400 hover:bg-slate-800'}`}>
                    <span className="w-4">🤖</span> Discord Bot
                  </button>
              </div>
          </div>

          {/* ASSET CREATION */}
          <div>
              <div className="text-xs font-bold text-slate-600 px-4 mb-2 uppercase tracking-wider flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-pink-500"></span>
                  Asset Creation
              </div>
              <div className="space-y-1">
                  <button onClick={() => setMode(AppMode.IMAGE_STUDIO)} className={`w-full text-left px-4 py-2 rounded-lg flex items-center gap-3 text-sm transition-all ${mode === AppMode.IMAGE_STUDIO ? 'bg-pink-500/10 text-pink-400 border border-pink-500/50' : 'text-slate-400 hover:bg-slate-800'}`}>
                    <span className="w-4">🎨</span> Image Studio
                  </button>
                  <button onClick={() => setMode(AppMode.BLENDER_BRIDGE)} className={`w-full text-left px-4 py-2 rounded-lg flex items-center gap-3 text-sm transition-all ${mode === AppMode.BLENDER_BRIDGE ? 'bg-orange-600/10 text-orange-500 border border-orange-600/50' : 'text-slate-400 hover:bg-slate-800'}`}>
                    <span className="w-4">🧊</span> Blender Bridge
                  </button>
                  <button onClick={() => setMode(AppMode.NIF_TOOLS)} className={`w-full text-left px-4 py-2 rounded-lg flex items-center gap-3 text-sm transition-all ${mode === AppMode.NIF_TOOLS ? 'bg-yellow-600/10 text-yellow-500 border border-yellow-600/50' : 'text-slate-400 hover:bg-slate-800'}`}>
                    <span className="w-4">🦴</span> NifUtils Suite
                  </button>
                  <button onClick={() => setMode(AppMode.TEXTURE_TOOLS)} className={`w-full text-left px-4 py-2 rounded-lg flex items-center gap-3 text-sm transition-all ${mode === AppMode.TEXTURE_TOOLS ? 'bg-cyan-600/10 text-cyan-500 border border-cyan-600/50' : 'text-slate-400 hover:bg-slate-800'}`}>
                    <span className="w-4">🖼️</span> Texture Tools
                  </button>
                  <div className="grid grid-cols-2 gap-1 px-1">
                     <button onClick={() => setMode(AppMode.GIMP_ASSISTANT)} className={`text-center py-1.5 rounded text-[10px] border ${mode === AppMode.GIMP_ASSISTANT ? 'border-stone-500 text-stone-300' : 'border-slate-800 text-slate-500 hover:bg-slate-800'}`}>GIMP</button>
                     <button onClick={() => setMode(AppMode.PHOTOPEA)} className={`text-center py-1.5 rounded text-[10px] border ${mode === AppMode.PHOTOPEA ? 'border-emerald-500 text-emerald-300' : 'border-slate-800 text-slate-500 hover:bg-slate-800'}`}>Photopea</button>
                     <button onClick={() => setMode(AppMode.SHADERMAP)} className={`text-center py-1.5 rounded text-[10px] border ${mode === AppMode.SHADERMAP ? 'border-teal-500 text-teal-300' : 'border-slate-800 text-slate-500 hover:bg-slate-800'}`}>ShaderMap</button>
                     <button onClick={() => setMode(AppMode.MATERIALIZE)} className={`text-center py-1.5 rounded text-[10px] border ${mode === AppMode.MATERIALIZE ? 'border-amber-500 text-amber-300' : 'border-slate-800 text-slate-500 hover:bg-slate-800'}`}>Materialize</button>
                  </div>
              </div>
          </div>

          {/* GAME ENGINEERING */}
          <div>
              <div className="text-xs font-bold text-slate-600 px-4 mb-2 uppercase tracking-wider flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-fallout-amber"></span>
                  Game Engineering
              </div>
              <div className="space-y-1">
                  <button onClick={() => setMode(AppMode.FALLOUT_ARCHITECT)} className={`w-full text-left px-4 py-2 rounded-lg flex items-center gap-3 text-sm transition-all ${mode === AppMode.FALLOUT_ARCHITECT ? 'bg-fallout-amber/10 text-fallout-amber border border-fallout-amber/50' : 'text-slate-400 hover:bg-slate-800'}`}>
                    <span className="w-4">☢️</span> FO4 Architect
                  </button>
                  <button onClick={() => setMode(AppMode.MOD_INTEGRATION)} className={`w-full text-left px-4 py-2 rounded-lg flex items-center gap-3 text-sm transition-all ${mode === AppMode.MOD_INTEGRATION ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/50' : 'text-slate-400 hover:bg-slate-800'}`}>
                    <span className="w-4">🧩</span> Mod Integrator
                  </button>
                  <button onClick={() => setMode(AppMode.RTX_REMIX)} className={`w-full text-left px-4 py-2 rounded-lg flex items-center gap-3 text-sm transition-all ${mode === AppMode.RTX_REMIX ? 'bg-green-600/10 text-green-500 border border-green-600/50' : 'text-slate-400 hover:bg-slate-800'}`}>
                    <span className="w-4">❇️</span> RTX Remix
                  </button>
              </div>
          </div>

          {/* SYSTEM & RESEARCH */}
          <div>
              <div className="text-xs font-bold text-slate-600 px-4 mb-2 uppercase tracking-wider flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-sky-500"></span>
                  System & Integration
              </div>
              <div className="space-y-1">
                  <button onClick={() => setMode(AppMode.MASTER_GUIDE)} className={`w-full text-left px-4 py-2 rounded-lg flex items-center gap-3 text-sm transition-all ${mode === AppMode.MASTER_GUIDE ? 'bg-sky-500/10 text-sky-400 border border-sky-500/50' : 'text-slate-400 hover:bg-slate-800'}`}>
                    <span className="w-4">🎓</span> Master Guide
                  </button>
                   <button onClick={() => setMode(AppMode.SOFTWARE_AUDIT)} className={`w-full text-left px-4 py-2 rounded-lg flex items-center gap-3 text-sm transition-all ${mode === AppMode.SOFTWARE_AUDIT ? 'bg-teal-500/10 text-teal-400 border border-teal-500/50' : 'text-slate-400 hover:bg-slate-800'}`}>
                    <span className="w-4">🩺</span> App Health
                  </button>
                  <button onClick={() => setMode(AppMode.SYSTEM_OPS)} className={`w-full text-left px-4 py-2 rounded-lg flex items-center gap-3 text-sm transition-all ${mode === AppMode.SYSTEM_OPS ? 'bg-slate-600/10 text-slate-400 border border-slate-600/50' : 'text-slate-400 hover:bg-slate-800'}`}>
                    <span className="w-4">⚙️</span> System Ops
                  </button>
                   <button onClick={() => setMode(AppMode.RESEARCH)} className={`w-full text-left px-4 py-2 rounded-lg flex items-center gap-3 text-sm transition-all ${mode === AppMode.RESEARCH ? 'bg-blue-500/10 text-blue-400 border border-blue-500/50' : 'text-slate-400 hover:bg-slate-800'}`}>
                    <span className="w-4">🔍</span> Research
                  </button>
                   <button onClick={() => setMode(AppMode.VISION_ANALYSIS)} className={`w-full text-left px-4 py-2 rounded-lg flex items-center gap-3 text-sm transition-all ${mode === AppMode.VISION_ANALYSIS ? 'bg-orange-500/10 text-orange-400 border border-orange-500/50' : 'text-slate-400 hover:bg-slate-800'}`}>
                    <span className="w-4">👁️</span> Vision
                  </button>
                  <button onClick={() => setMode(AppMode.UPSCAYL)} className={`w-full text-left px-4 py-2 rounded-lg flex items-center gap-3 text-sm transition-all ${mode === AppMode.UPSCAYL ? 'bg-violet-600/10 text-violet-500 border border-violet-600/50' : 'text-slate-400 hover:bg-slate-800'}`}>
                    <span className="w-4">⏫</span> Upscayl
                  </button>
              </div>
          </div>

        </nav>

        <div className="p-4 border-t border-slate-800">
          <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 block">
            Context
          </label>
          <select 
            value={context} 
            onChange={(e) => setContext(e.target.value as SoftwareContext)}
            className="w-full bg-slate-950 border border-slate-700 text-sm text-slate-300 rounded p-2 focus:ring-1 focus:ring-mod-green focus:outline-none"
          >
            {Object.values(SoftwareContext).map((ctx) => (
              <option key={ctx} value={ctx}>{ctx}</option>
            ))}
          </select>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col md:flex-row relative">
        {/* Center Stage: The Active Tool */}
        <div className="flex-1 p-6 overflow-y-auto">
          {mode === AppMode.LIVE_ASSIST && <LiveAssistant context={context} onContextChange={setContext} onLog={addLog} />}
          {mode === AppMode.CHAT_BOT && <ChatBot onLog={addLog} />}
          {mode === AppMode.DISCORD_BOT_GEN && <DiscordBotGenerator onLog={addLog} />}
          {mode === AppMode.IMAGE_STUDIO && <ImageStudio onLog={addLog} />}
          {mode === AppMode.VISION_ANALYSIS && <VisionAnalyzer onLog={addLog} />}
          {mode === AppMode.BLENDER_BRIDGE && <BlenderIntegrator onLog={addLog} />}
          {mode === AppMode.SOFTWARE_AUDIT && <SoftwareAuditor onLog={addLog} />}
          {mode === AppMode.MOD_INTEGRATION && <ModIntegrator onLog={addLog} />}
          {mode === AppMode.TEXTURE_TOOLS && <TextureTools onLog={addLog} />}
          {mode === AppMode.RTX_REMIX && <RTXRemixAssistant onLog={addLog} />}
          {mode === AppMode.NIF_TOOLS && <NifTools onLog={addLog} />}
          {mode === AppMode.GIMP_ASSISTANT && <GimpAssistant onLog={addLog} />}
          {mode === AppMode.SHADERMAP && <ShaderMapAssistant onLog={addLog} />}
          {mode === AppMode.PHOTOPEA && <PhotopeaAssistant onLog={addLog} />}
          {mode === AppMode.UPSCAYL && <UpscaylAssistant onLog={addLog} />}
          {mode === AppMode.MATERIALIZE && <MaterializeAssistant onLog={addLog} />}
          {mode === AppMode.MASTER_GUIDE && <ModdingMasterGuide onLog={addLog} />}
          {mode === AppMode.FALLOUT_ARCHITECT && <Fallout4Architect onLog={addLog} />}
          {mode === AppMode.RESEARCH && <ResearchAssistant onLog={addLog} />}
          {mode === AppMode.SYSTEM_OPS && <SystemOptimizer onLog={addLog} />}
        </div>

        {/* Right Panel: Output / Log / Chat History */}
        <div className="w-full md:w-96 bg-slate-900/50 border-l border-slate-800 flex flex-col h-[50vh] md:h-auto">
          <div className="p-4 border-b border-slate-800 bg-slate-900">
            <h3 className="font-mono text-sm text-slate-400">OPERATION LOG</h3>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 space-y-4 font-mono text-sm" ref={scrollRef}>
            {logs.length === 0 && (
              <div className="text-slate-600 text-center mt-10 italic">
                System initialized. Waiting for input...
              </div>
            )}
            {logs.map((log, idx) => (
              <LogEntryItem key={idx} log={log} />
            ))}
          </div>
        </div>
      </main>
    </div>
  );
};

export default App;
