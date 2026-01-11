import React, { useState, useEffect, useRef } from 'react';
import { GoogleGenAI, Modality } from "@google/genai";
import { Play, FileAudio, Sliders, Radio, Mic2, Cpu, Music, Download, Volume2, Activity, Wifi, RefreshCw } from 'lucide-react';

const AudioStudio: React.FC = () => {
  const [text, setText] = useState("System checks complete. Welcome back, user.");
  const [loading, setLoading] = useState(false);
  const [activeEffect, setActiveEffect] = useState<'none' | 'radio' | 'robot' | 'ethereal'>('none');
  const [audioBuffer, setAudioBuffer] = useState<AudioBuffer | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  
  // Refs for Audio API
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<AudioBufferSourceNode | null>(null);
  const analyzerRef = useRef<AnalyserNode | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(0);

  // Initialize Audio Context on mount
  useEffect(() => {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      analyzerRef.current = audioContextRef.current.createAnalyser();
      analyzerRef.current.fftSize = 256;
      
      return () => {
          if (audioContextRef.current?.state !== 'closed') {
              audioContextRef.current?.close();
          }
          cancelAnimationFrame(animationRef.current);
      };
  }, []);

  // Visualizer Loop
  useEffect(() => {
      const draw = () => {
          if (!canvasRef.current || !analyzerRef.current) return;
          
          const canvas = canvasRef.current;
          const ctx = canvas.getContext('2d');
          if (!ctx) return;

          const bufferLength = analyzerRef.current.frequencyBinCount;
          const dataArray = new Uint8Array(bufferLength);
          analyzerRef.current.getByteFrequencyData(dataArray);

          ctx.fillStyle = '#0f172a'; // Match bg
          ctx.fillRect(0, 0, canvas.width, canvas.height);

          const barWidth = (canvas.width / bufferLength) * 2.5;
          let barHeight;
          let x = 0;

          for(let i = 0; i < bufferLength; i++) {
              barHeight = dataArray[i] / 2;
              
              // Gradient fill based on active effect
              const gradient = ctx.createLinearGradient(0, canvas.height, 0, canvas.height - barHeight);
              if (activeEffect === 'radio') {
                  gradient.addColorStop(0, '#d97706'); // Amber
                  gradient.addColorStop(1, '#fbbf24');
              } else if (activeEffect === 'robot') {
                  gradient.addColorStop(0, '#dc2626'); // Red
                  gradient.addColorStop(1, '#f87171');
              } else if (activeEffect === 'ethereal') {
                  gradient.addColorStop(0, '#0ea5e9'); // Blue
                  gradient.addColorStop(1, '#a855f7'); // Purple
              } else {
                  gradient.addColorStop(0, '#059669'); // Emerald
                  gradient.addColorStop(1, '#34d399');
              }

              ctx.fillStyle = gradient;
              ctx.fillRect(x, canvas.height - barHeight, barWidth, barHeight);

              x += barWidth + 1;
          }

          animationRef.current = requestAnimationFrame(draw);
      };

      draw();
  }, [activeEffect]);

  const applyEffects = (ctx: AudioContext, source: AudioNode, destination: AudioNode) => {
      if (activeEffect === 'radio') {
          // Bandpass Filter (Telephone/Radio effect)
          const filter = ctx.createBiquadFilter();
          filter.type = 'bandpass';
          filter.frequency.value = 1000;
          filter.Q.value = 1.0;
          
          // Distortion
          const distortion = ctx.createWaveShaper();
          const curve = new Float32Array(44100);
          const deg = Math.PI / 180;
          for (let i = 0; i < 44100; ++i) {
            const x = i * 2 / 44100 - 1;
            curve[i] = (3 + 20) * x * 20 * deg / (Math.PI + 20 * Math.abs(x));
          }
          distortion.curve = curve;
          distortion.oversample = '4x';

          source.connect(filter);
          filter.connect(distortion);
          distortion.connect(destination);
      } 
      else if (activeEffect === 'robot') {
          // Ring Modulator (Oscillator multiplication)
          const osc = ctx.createOscillator();
          osc.frequency.value = 50; // Low rumble
          osc.type = 'square';
          osc.start();

          const gain = ctx.createGain();
          gain.gain.value = 0.5;

          const ringMod = ctx.createGain();
          ringMod.gain.value = 0.0; // Needs complex wiring for true ring mod, simplifying to delay/pitch
          
          // Simple Robotic Delay
          const delay = ctx.createDelay();
          delay.delayTime.value = 0.01;
          
          source.connect(delay);
          delay.connect(destination);
          
          // Mix in oscillator (simulated metallic noise)
          const oscGain = ctx.createGain();
          oscGain.gain.value = 0.05;
          osc.connect(oscGain);
          oscGain.connect(destination);
      }
      else if (activeEffect === 'ethereal') {
          // Reverb simulation using multiple delays
          const delay1 = ctx.createDelay();
          const delay2 = ctx.createDelay();
          const feedback = ctx.createGain();
          
          delay1.delayTime.value = 0.15;
          delay2.delayTime.value = 0.3;
          feedback.gain.value = 0.4;
          
          source.connect(delay1);
          delay1.connect(delay2);
          delay2.connect(feedback);
          feedback.connect(delay1);
          
          delay1.connect(destination);
          delay2.connect(destination);
          source.connect(destination); // Dry signal
      }
      else {
          source.connect(destination);
      }
  };

  const handleGenerate = async () => {
    if (!text) return;
    setLoading(true);
    // Stop previous
    if (sourceRef.current) sourceRef.current.stop();

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-preview-tts',
        contents: [{ parts: [{ text }] }],
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: 'Fenrir' },
            },
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
         for(let i=0; i<dataInt16.length; i++) {
             channelData[i] = dataInt16[i] / 32768.0;
         }
         
         setAudioBuffer(buffer);
         playSound(buffer);
      }

    } catch (e) {
      console.error(e);
      alert('Generation Error');
    } finally {
      setLoading(false);
    }
  };

  const playSound = (buffer: AudioBuffer | null) => {
      if (!buffer || !audioContextRef.current) return;
      
      const ctx = audioContextRef.current;
      if (sourceRef.current) sourceRef.current.stop();
      
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      
      const masterGain = ctx.createGain();
      masterGain.gain.value = 1.0;

      // Connect Chain: Source -> FX -> Analyzer -> Destination
      applyEffects(ctx, source, masterGain);
      
      if (analyzerRef.current) {
          masterGain.connect(analyzerRef.current);
          analyzerRef.current.connect(ctx.destination);
      } else {
          masterGain.connect(ctx.destination);
      }

      sourceRef.current = source;
      source.start();
      setIsPlaying(true);
      source.onended = () => setIsPlaying(false);
  };

  // Re-play when effect changes if we have a buffer
  useEffect(() => {
      if (audioBuffer && !isPlaying) {
          // Optional: Auto-preview on effect change? 
          // Let's not auto-play to avoid annoyance, user can hit play.
      }
  }, [activeEffect]);

  return (
    <div className="h-full flex flex-col bg-forge-dark overflow-hidden">
      {/* Header */}
      <div className="p-6 border-b border-slate-700 bg-forge-panel flex justify-between items-center">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-indigo-500/20 rounded-xl border border-indigo-500/30">
                <Mic2 className="w-6 h-6 text-indigo-400" />
            </div>
            <div>
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                    Audio Studio <span className="text-[10px] bg-slate-800 px-2 py-0.5 rounded text-slate-400 border border-slate-700">v3.0</span>
                </h2>
                <p className="text-xs text-slate-400 font-mono">Neural Synthesis & DSP Rack</p>
            </div>
          </div>
          <div className="flex gap-2">
              <div className="flex items-center gap-2 px-3 py-1 bg-slate-800 rounded-full border border-slate-600 text-xs text-slate-300">
                  <Activity className="w-3 h-3 text-emerald-400" />
                  Engine Ready
              </div>
          </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
          {/* Left Panel: Inputs & Timeline */}
          <div className="flex-1 p-6 flex flex-col gap-6 overflow-y-auto">
              
              {/* Input Section */}
              <div className="bg-forge-panel border border-slate-700 rounded-xl p-1 shadow-lg">
                  <textarea
                    className="w-full h-32 bg-slate-900 border-none rounded-t-lg p-4 text-lg text-slate-200 focus:ring-0 resize-none font-mono"
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    placeholder="Enter dialogue script here..."
                  />
                  <div className="bg-slate-800 p-2 rounded-b-lg flex justify-between items-center">
                      <div className="flex items-center gap-2 text-xs text-slate-400 px-2">
                          <span>Characters: {text.length}</span>
                          <span>|</span>
                          <span>Est. Duration: {(text.length / 15).toFixed(1)}s</span>
                      </div>
                      <button
                        onClick={handleGenerate}
                        disabled={loading}
                        className="px-6 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-bold flex items-center gap-2 transition-all shadow-lg disabled:opacity-50"
                      >
                        {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Wifi className="w-4 h-4" />}
                        {loading ? 'Synthesizing...' : 'Generate Raw Audio'}
                      </button>
                  </div>
              </div>

              {/* Visualizer & Playback */}
              <div className="flex-1 bg-black rounded-xl border border-slate-700 relative overflow-hidden flex flex-col">
                   <div className="absolute top-4 left-4 z-10 text-xs font-mono text-slate-500 flex items-center gap-2">
                       <Activity className="w-3 h-3" /> FREQUENCY ANALYZER
                   </div>
                   
                   {/* Canvas Visualizer */}
                   <canvas ref={canvasRef} width={800} height={300} className="w-full h-full opacity-80" />
                   
                   {/* Playback Controls Overlay */}
                   <div className="absolute bottom-0 left-0 w-full p-4 bg-gradient-to-t from-black to-transparent flex justify-center items-end pb-8">
                       <button 
                           onClick={() => playSound(audioBuffer)}
                           disabled={!audioBuffer}
                           className="w-16 h-16 rounded-full bg-white text-black flex items-center justify-center hover:scale-105 transition-transform disabled:opacity-20 disabled:scale-100 shadow-[0_0_30px_rgba(255,255,255,0.3)]"
                       >
                           <Play className={`w-6 h-6 fill-current ${isPlaying ? 'text-indigo-600' : ''}`} />
                       </button>
                   </div>
              </div>
          </div>

          {/* Right Panel: FX Rack */}
          <div className="w-80 bg-slate-900 border-l border-slate-800 p-6 flex flex-col gap-4">
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2 mb-2">
                  <Sliders className="w-4 h-4" /> FX Rack
              </h3>

              {/* Effect: None */}
              <button 
                onClick={() => setActiveEffect('none')}
                className={`p-4 rounded-xl border transition-all text-left group ${activeEffect === 'none' ? 'bg-slate-800 border-emerald-500 shadow-md' : 'bg-slate-900 border-slate-700 hover:border-slate-500'}`}
              >
                  <div className="flex justify-between items-start mb-2">
                      <div className={`p-2 rounded-lg ${activeEffect === 'none' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-800 text-slate-500'}`}>
                          <Volume2 className="w-5 h-5" />
                      </div>
                      <div className={`w-2 h-2 rounded-full ${activeEffect === 'none' ? 'bg-emerald-500 shadow-[0_0_10px_#10b981]' : 'bg-slate-800'}`}></div>
                  </div>
                  <div className="font-bold text-slate-200">Clean Signal</div>
                  <div className="text-xs text-slate-500 mt-1">Direct from Neural Model</div>
              </button>

              {/* Effect: Pip-Boy Radio */}
              <button 
                onClick={() => setActiveEffect('radio')}
                className={`p-4 rounded-xl border transition-all text-left group ${activeEffect === 'radio' ? 'bg-slate-800 border-amber-500 shadow-md' : 'bg-slate-900 border-slate-700 hover:border-slate-500'}`}
              >
                  <div className="flex justify-between items-start mb-2">
                      <div className={`p-2 rounded-lg ${activeEffect === 'radio' ? 'bg-amber-500/20 text-amber-400' : 'bg-slate-800 text-slate-500'}`}>
                          <Radio className="w-5 h-5" />
                      </div>
                      <div className={`w-2 h-2 rounded-full ${activeEffect === 'radio' ? 'bg-amber-500 shadow-[0_0_10px_#f59e0b]' : 'bg-slate-800'}`}></div>
                  </div>
                  <div className="font-bold text-slate-200">Pip-Boy Radio</div>
                  <div className="text-xs text-slate-500 mt-1">Bandpass + Overdrive</div>
              </button>

              {/* Effect: Protectron */}
              <button 
                onClick={() => setActiveEffect('robot')}
                className={`p-4 rounded-xl border transition-all text-left group ${activeEffect === 'robot' ? 'bg-slate-800 border-red-500 shadow-md' : 'bg-slate-900 border-slate-700 hover:border-slate-500'}`}
              >
                  <div className="flex justify-between items-start mb-2">
                      <div className={`p-2 rounded-lg ${activeEffect === 'robot' ? 'bg-red-500/20 text-red-400' : 'bg-slate-800 text-slate-500'}`}>
                          <Cpu className="w-5 h-5" />
                      </div>
                      <div className={`w-2 h-2 rounded-full ${activeEffect === 'robot' ? 'bg-red-500 shadow-[0_0_10px_#ef4444]' : 'bg-slate-800'}`}></div>
                  </div>
                  <div className="font-bold text-slate-200">Protectron Unit</div>
                  <div className="text-xs text-slate-500 mt-1">Metallic Delay + Modulation</div>
              </button>

              {/* Effect: Ethereal */}
              <button 
                onClick={() => setActiveEffect('ethereal')}
                className={`p-4 rounded-xl border transition-all text-left group ${activeEffect === 'ethereal' ? 'bg-slate-800 border-sky-500 shadow-md' : 'bg-slate-900 border-slate-700 hover:border-slate-500'}`}
              >
                  <div className="flex justify-between items-start mb-2">
                      <div className={`p-2 rounded-lg ${activeEffect === 'ethereal' ? 'bg-sky-500/20 text-sky-400' : 'bg-slate-800 text-slate-500'}`}>
                          <Music className="w-5 h-5" />
                      </div>
                      <div className={`w-2 h-2 rounded-full ${activeEffect === 'ethereal' ? 'bg-sky-500 shadow-[0_0_10px_#0ea5e9]' : 'bg-slate-800'}`}></div>
                  </div>
                  <div className="font-bold text-slate-200">Ethereal Spirit</div>
                  <div className="text-xs text-slate-500 mt-1">Multi-Tap Reverb Chain</div>
              </button>

              {/* Export */}
              <div className="mt-auto pt-6 border-t border-slate-800">
                  <button className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg flex items-center justify-center gap-2 text-sm font-bold border border-slate-600 transition-colors">
                      <Download className="w-4 h-4" /> Export .WAV
                  </button>
              </div>
          </div>
      </div>
    </div>
  );
};

export default AudioStudio;