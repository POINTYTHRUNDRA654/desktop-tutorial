import React, { useState, useEffect, useRef } from 'react';
import { GoogleGenAI, Modality } from "@google/genai";
import { Gamepad2, Play, SkipForward, RefreshCw, MessageSquare, Image as ImageIcon, Volume2, Mic2, Terminal, User, ArrowRight, Skull, MapPin, Box } from 'lucide-react';

interface GameState {
  location: string;
  questStage: number;
  inventory: string[];
  health: number;
  activeObjectives: string[];
}

interface DialogueNode {
  speaker: string;
  text: string;
  options: { label: string, nextState?: Partial<GameState> }[];
}

const Holodeck: React.FC = () => {
  // --- Game Engine State ---
  const [isPlaying, setIsPlaying] = useState(false);
  const [loadingTurn, setLoadingTurn] = useState(false);
  
  const [gameState, setGameState] = useState<GameState>({
      location: "Goodneighbor - The Third Rail",
      questStage: 10,
      inventory: ["Caps (150)", "10mm Pistol"],
      health: 100,
      activeObjectives: ["Find the contact", "Avoid MacCready"]
  });

  const [narrativeLog, setNarrativeLog] = useState<{type: 'narrative' | 'dialogue', content: string, speaker?: string}[]>([]);
  const [currentSceneImg, setCurrentSceneImg] = useState<string>("https://placehold.co/1280x720/111827/38bdf8?text=Initialize+Simulation");
  const [currentDialogue, setCurrentDialogue] = useState<DialogueNode | null>(null);

  // Audio Refs
  const audioContextRef = useRef<AudioContext | null>(null);

  // --- Engine Logic ---

  const initSimulation = () => {
      setIsPlaying(true);
      setNarrativeLog([{
          type: 'narrative',
          content: "INITIALIZING HOLODECK SIMULATION [v4.2]... LOADING ASSETS... DONE."
      }]);
      processTurn("Start the simulation. The player enters The Third Rail bar in Goodneighbor.");
  };

  const processTurn = async (playerAction: string) => {
      setLoadingTurn(true);
      
      try {
          const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
          
          // 1. Game Master Logic (Text)
          const prompt = `
          You are the AI Game Master for a Fallout 4 text adventure playtest.
          Current State: ${JSON.stringify(gameState)}
          Player Action: "${playerAction}"
          
          Output JSON with:
          - narrative: (string) Descriptive text of what happens.
          - speaker: (string, optional) If an NPC speaks.
          - dialogue: (string, optional) What the NPC says.
          - options: (array of strings) 2-3 choices for the player.
          - stateUpdate: (object) Changes to GameState (e.g. questStage, inventory).
          - visualPrompt: (string) A prompt to generate the background image for this scene.
          `;
          
          const response = await ai.models.generateContent({
              model: 'gemini-3-flash-preview',
              contents: prompt,
              config: { responseMimeType: 'application/json' }
          });
          
          const result = JSON.parse(response.text);
          
          // Update State
          if (result.stateUpdate) {
              setGameState(prev => ({ ...prev, ...result.stateUpdate }));
          }
          
          // Update Log
          setNarrativeLog(prev => [
              ...prev, 
              { type: 'narrative', content: result.narrative },
              ...(result.dialogue ? [{ type: 'dialogue' as const, content: result.dialogue, speaker: result.speaker }] : [])
          ]);

          // Set Choices
          setCurrentDialogue({
              speaker: result.speaker || "Game Master",
              text: result.dialogue || result.narrative,
              options: result.options.map((o: string) => ({ label: o }))
          });

          // 2. Synthesize Voice (If Dialogue exists)
          if (result.dialogue) {
              speakText(result.dialogue);
          }

          // 3. Generate Visual (Mocked for speed, Real on request)
          // In a real app, we'd call the image gen here. For speed, we just set the prompt to state if we want to trigger it manually.
          // Or we simulate it:
          if (Math.random() > 0.7) { // Only update image occasionally to save resources/time
              // Simulate image update
              // setCurrentSceneImg(generatedUrl); 
          }

      } catch (e) {
          console.error(e);
          setNarrativeLog(prev => [...prev, { type: 'narrative', content: "SYSTEM ERROR: Simulation Desync." }]);
      } finally {
          setLoadingTurn(false);
      }
  };

  const speakText = async (text: string) => {
      try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-preview-tts',
            contents: [{ parts: [{ text }] }],
            config: {
                responseModalities: [Modality.AUDIO],
                speechConfig: {
                    voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Fenrir' } },
                },
            },
        });
        
        const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
        if (base64Audio) {
            if (!audioContextRef.current) audioContextRef.current = new window.AudioContext();
            const ctx = audioContextRef.current;
            const binaryString = atob(base64Audio);
            const len = binaryString.length;
            const bytes = new Uint8Array(len);
            for (let i = 0; i < len; i++) bytes[i] = binaryString.charCodeAt(i);
            const dataInt16 = new Int16Array(bytes.buffer);
            const buffer = ctx.createBuffer(1, dataInt16.length, 24000);
            const channelData = buffer.getChannelData(0);
            for(let i=0; i<dataInt16.length; i++) channelData[i] = dataInt16[i] / 32768.0;
            
            const source = ctx.createBufferSource();
            source.buffer = buffer;
            source.connect(ctx.destination);
            source.start();
        }
      } catch (e) { console.error("TTS Failed", e); }
  };

  const handleGenerateFrame = async () => {
      // Manually trigger image generation for current state
      // This is a placeholder for the actual API call logic similar to ImageSuite
      const prompt = `Fallout 4 post-apocalyptic concept art, ${gameState.location}, cinematic lighting, 4k`;
      // Here we would call the Image API and update setCurrentSceneImg
      alert(`[MOCK] Generating high-res render for: ${prompt}`);
  };

  return (
    <div className="h-full flex flex-col bg-black text-slate-200 overflow-hidden relative font-sans">
      
      {/* Immersive Background Layer */}
      <div className="absolute inset-0 z-0">
          <img 
            src={currentSceneImg} 
            className="w-full h-full object-cover opacity-60" 
            alt="Scene" 
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent"></div>
          {/* Scanlines Effect */}
          <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] z-10 bg-[length:100%_2px,3px_100%] pointer-events-none"></div>
      </div>

      {/* Top HUD */}
      <div className="relative z-20 p-6 flex justify-between items-start">
          <div className="flex items-center gap-4 bg-black/60 backdrop-blur-md px-4 py-2 rounded-lg border border-slate-700/50">
              <Gamepad2 className="w-6 h-6 text-emerald-400" />
              <div>
                  <h1 className="text-lg font-bold text-white tracking-widest uppercase">Holodeck</h1>
                  <div className="flex items-center gap-2 text-[10px] text-slate-400 font-mono">
                      <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
                      SIMULATION_ACTIVE
                  </div>
              </div>
          </div>
          
          {/* Status Indicators */}
          <div className="flex gap-4">
              <div className="bg-black/60 backdrop-blur-md p-3 rounded-lg border border-slate-700/50 min-w-[120px]">
                  <div className="text-[10px] text-slate-500 uppercase font-bold mb-1 flex items-center gap-1">
                      <MapPin className="w-3 h-3" /> Location
                  </div>
                  <div className="text-xs font-mono text-emerald-300 truncate">{gameState.location}</div>
              </div>
              <div className="bg-black/60 backdrop-blur-md p-3 rounded-lg border border-slate-700/50 min-w-[100px]">
                  <div className="text-[10px] text-slate-500 uppercase font-bold mb-1 flex items-center gap-1">
                      <Skull className="w-3 h-3" /> Integrity
                  </div>
                  <div className="w-full h-1.5 bg-slate-700 rounded-full mt-1">
                      <div className="h-full bg-emerald-500 rounded-full" style={{width: `${gameState.health}%`}}></div>
                  </div>
              </div>
          </div>
      </div>

      {/* Main Content Area */}
      <div className="relative z-20 flex-1 flex flex-col justify-end p-8 pb-12 max-w-5xl mx-auto w-full">
          
          {/* Narrative Log (Scrollable) */}
          <div className="flex-1 overflow-y-auto mb-6 pr-4 space-y-4 mask-gradient-top custom-scrollbar max-h-[40vh]">
              {narrativeLog.map((log, i) => (
                  <div key={i} className={`animate-fade-in ${log.type === 'dialogue' ? 'ml-8 border-l-2 border-emerald-500 pl-4' : ''}`}>
                      {log.speaker && (
                          <div className="text-xs font-bold text-emerald-400 mb-1 uppercase tracking-wider">
                              {log.speaker}
                          </div>
                      )}
                      <p className={`text-lg leading-relaxed ${log.type === 'narrative' ? 'text-slate-300 italic font-serif' : 'text-white font-medium'}`}>
                          {log.content}
                      </p>
                  </div>
              ))}
              {loadingTurn && (
                  <div className="flex items-center gap-2 text-slate-500 animate-pulse">
                      <RefreshCw className="w-4 h-4 animate-spin" /> Calculating outcome...
                  </div>
              )}
          </div>

          {/* Interaction Box */}
          {isPlaying ? (
              <div className="bg-black/80 backdrop-blur-xl border border-slate-700 rounded-2xl p-6 shadow-2xl">
                  {currentDialogue && (
                      <div className="mb-6">
                           <div className="text-sm text-slate-400 mb-4 font-mono uppercase">
                               <span className="text-forge-accent">Decision Point:</span> What do you do?
                           </div>
                           <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                               {currentDialogue.options.map((option, i) => (
                                   <button
                                       key={i}
                                       onClick={() => processTurn(option.label)}
                                       disabled={loadingTurn}
                                       className="text-left px-5 py-4 bg-slate-800/50 hover:bg-forge-accent/20 border border-slate-700 hover:border-forge-accent rounded-xl transition-all group"
                                   >
                                       <span className="text-slate-500 group-hover:text-forge-accent mr-3 font-mono">0{i+1}.</span>
                                       <span className="text-slate-200 group-hover:text-white font-medium">{option.label}</span>
                                   </button>
                               ))}
                               
                               {/* Custom Input */}
                               <div className="relative group col-span-1 md:col-span-2 mt-2">
                                   <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                       <Terminal className="h-4 w-4 text-slate-500 group-focus-within:text-forge-accent" />
                                   </div>
                                   <input 
                                      type="text" 
                                      placeholder="Improvise action..."
                                      className="block w-full pl-10 pr-3 py-3 border border-slate-700 rounded-xl leading-5 bg-slate-900/50 text-slate-300 placeholder-slate-500 focus:outline-none focus:border-forge-accent focus:ring-1 focus:ring-forge-accent sm:text-sm"
                                      onKeyDown={(e) => {
                                          if (e.key === 'Enter') {
                                              processTurn(e.currentTarget.value);
                                              e.currentTarget.value = '';
                                          }
                                      }}
                                   />
                               </div>
                           </div>
                      </div>
                  )}
                  
                  {/* Tools Strip */}
                  <div className="flex justify-between items-center border-t border-slate-800 pt-4 mt-2">
                       <div className="flex gap-2">
                           <button onClick={handleGenerateFrame} className="p-2 hover:bg-slate-700 rounded text-slate-500 hover:text-white" title="Render Hi-Res Frame">
                               <ImageIcon className="w-4 h-4" />
                           </button>
                           <button className="p-2 hover:bg-slate-700 rounded text-slate-500 hover:text-white" title="Replay Voice">
                               <Volume2 className="w-4 h-4" />
                           </button>
                       </div>
                       <div className="text-[10px] font-mono text-slate-600">
                           QUEST_ID: {gameState.questStage} | SEED: 88219
                       </div>
                  </div>
              </div>
          ) : (
              <div className="flex flex-col items-center justify-center py-12">
                  <button 
                      onClick={initSimulation}
                      className="group relative inline-flex items-center justify-center px-8 py-4 font-bold text-white transition-all duration-200 bg-emerald-600 font-lg rounded-full focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-600 hover:bg-emerald-500 hover:scale-105"
                  >
                      <Play className="w-6 h-6 mr-2 fill-current" />
                      Initialize Simulation
                      <div className="absolute -inset-3 rounded-full bg-emerald-400 opacity-20 group-hover:opacity-40 blur-lg transition-opacity duration-200"></div>
                  </button>
                  <p className="mt-4 text-slate-500 text-sm font-mono">Load default scenario: "Goodneighbor"</p>
              </div>
          )}
      </div>

      {/* Right Debug Panel (Collapsible) */}
      <div className="absolute right-0 top-20 bottom-0 w-64 bg-black/80 backdrop-blur border-l border-slate-800 p-4 transform transition-transform translate-x-full hover:translate-x-0 z-30">
           <div className="absolute -left-8 top-1/2 -translate-y-1/2 bg-slate-800 p-2 rounded-l-lg border-l border-t border-b border-slate-600 cursor-pointer">
               <Terminal className="w-4 h-4 text-slate-400" />
           </div>
           
           <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4">State Inspector</h3>
           
           <div className="space-y-4">
               <div>
                   <label className="text-[10px] text-slate-500 uppercase">Inventory</label>
                   <div className="mt-1 flex flex-wrap gap-1">
                       {gameState.inventory.map(i => (
                           <span key={i} className="px-2 py-1 bg-slate-800 border border-slate-700 rounded text-[10px] text-slate-300">{i}</span>
                       ))}
                   </div>
               </div>
               
               <div>
                   <label className="text-[10px] text-slate-500 uppercase">Quest Objectives</label>
                   <ul className="mt-1 space-y-1">
                       {gameState.activeObjectives.map((o, i) => (
                           <li key={i} className="flex items-start gap-2 text-xs text-slate-300">
                               <Box className="w-3 h-3 text-forge-accent mt-0.5" />
                               {o}
                           </li>
                       ))}
                   </ul>
               </div>

               <div>
                   <label className="text-[10px] text-slate-500 uppercase">Engine Variables</label>
                   <div className="mt-1 bg-slate-900 p-2 rounded border border-slate-800 font-mono text-[10px] text-green-400">
                       Global_Time: 14:02<br/>
                       Weather: Rain_Heavy<br/>
                       Player_Faction: Neutral<br/>
                       Stealth_Meter: 12%
                   </div>
               </div>
           </div>
      </div>
    </div>
  );
};

export default Holodeck;