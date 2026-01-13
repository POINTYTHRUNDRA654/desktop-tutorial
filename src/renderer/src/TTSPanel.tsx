import React, { useState, useEffect, useRef } from 'react';
import { Play, FileAudio, Sliders, Radio, Mic2, Cpu, Music, Download, Volume2, Activity, Settings, Save, Upload, Trash2, Folder } from 'lucide-react';

const AudioStudio: React.FC = () => {
  const [audioBuffer, setAudioBuffer] = useState<AudioBuffer | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioFiles, setAudioFiles] = useState<{ name: string; buffer: AudioBuffer; duration: number }[]>([]);
  const [selectedFile, setSelectedFile] = useState<number | null>(null);
  const [modPath, setModPath] = useState<string>('');
  const [activeEffect, setActiveEffect] = useState<'none' | 'radio' | 'robot' | 'ethereal'>('none');
  
  // Audio processing controls
  const [volumeLevel, setVolumeLevel] = useState(1.0);
  const [echoAmount, setEchoAmount] = useState(0);
  const [pitchShift, setPitchShift] = useState(1.0);
  const [audioQuality, setAudioQuality] = useState<'16bit-22k' | '16bit-44k' | '24bit-48k'>('16bit-44k');
  
  // Refs for Audio API
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<AudioBufferSourceNode | null>(null);
  const analyzerRef = useRef<AnalyserNode | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  // Handle audio file uploads
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;

      try {
          const arrayBuffer = await file.arrayBuffer();
          const audioCtx = audioContextRef.current || new window.AudioContext();
          const buffer = await audioCtx.decodeAudioData(arrayBuffer);
          
          const duration = buffer.duration;
          const newFile = { name: file.name, buffer, duration };
          
          setAudioFiles([...audioFiles, newFile]);
          setSelectedFile(audioFiles.length);
          setAudioBuffer(buffer);
          
          if (fileInputRef.current) fileInputRef.current.value = '';
      } catch (error) {
          console.error('Error loading audio file:', error);
          alert('Failed to load audio file. Ensure it is a valid WAV, MP3, or OGG file.');
      }
  };

  // Export audio to WAV file (Fallout 4 compatible format)
  const exportToWAV = async () => {
      if (!audioBuffer || !audioContextRef.current) {
          alert('No audio to export. Load or process audio first.');
          return;
      }

      try {
          const ctx = audioContextRef.current;
          const sampleRate = ctx.sampleRate;
          const channels = audioBuffer.numberOfChannels;
          const length = audioBuffer.length;
          
          // Determine bit depth based on quality setting
          const bytesPerSample = audioQuality.startsWith('24bit') ? 3 : 2;
          const headerSize = 44;
          const totalSize = headerSize + (length * channels * bytesPerSample);
          
          const arrayBuffer = new ArrayBuffer(totalSize);
          const view = new DataView(arrayBuffer);
          
          // Write WAV header
          const writeString = (offset: number, str: string) => {
              for (let i = 0; i < str.length; i++) {
                  view.setUint8(offset + i, str.charCodeAt(i));
              }
          };
          
          writeString(0, 'RIFF');
          view.setUint32(4, totalSize - 8, true);
          writeString(8, 'WAVE');
          writeString(12, 'fmt ');
          view.setUint32(16, 16, true); // fmt size
          view.setUint16(20, 1, true); // PCM format
          view.setUint16(22, channels, true);
          view.setUint32(24, sampleRate, true);
          view.setUint32(28, sampleRate * channels * bytesPerSample, true); // byte rate
          view.setUint16(32, channels * bytesPerSample, true); // block align
          view.setUint16(34, 8 * bytesPerSample, true); // bits per sample
          writeString(36, 'data');
          view.setUint32(40, totalSize - 44, true);
          
          // Write audio data
          let offset = 44;
          const maxValue = Math.pow(2, 8 * bytesPerSample - 1) - 1;
          
          for (let i = 0; i < length; i++) {
              for (let ch = 0; ch < channels; ch++) {
                  const sample = audioBuffer.getChannelData(ch)[i] * maxValue;
                  
                  if (bytesPerSample === 2) {
                      view.setInt16(offset, sample, true);
                      offset += 2;
                  } else {
                      const sample24 = Math.max(-8388608, Math.min(8388607, sample));
                      view.setUint8(offset, (sample24 >> 0) & 0xFF);
                      view.setUint8(offset + 1, (sample24 >> 8) & 0xFF);
                      view.setUint8(offset + 2, (sample24 >> 16) & 0xFF);
                      offset += 3;
                  }
              }
          }
          
          // Save file
          const blob = new Blob([arrayBuffer], { type: 'audio/wav' });
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = `${selectedFile !== null ? audioFiles[selectedFile].name.replace(/\.[^.]+$/, '') : 'audio'}_${audioQuality}.wav`;
          link.click();
          URL.revokeObjectURL(url);
          
          alert('Audio exported successfully!');
      } catch (error) {
          console.error('Export error:', error);
          alert('Failed to export audio.');
      }
  };

  // Apply audio effects chain
  const applyEffectsChain = (ctx: AudioContext, source: AudioNode, destination: AudioNode) => {
      const volumeGain = ctx.createGain();
      volumeGain.gain.value = volumeLevel;
      
      source.connect(volumeGain);
      let current: AudioNode = volumeGain;

      if (activeEffect === 'radio') {
          // Radio effect: bandpass filter + slight distortion
          const filter = ctx.createBiquadFilter();
          filter.type = 'bandpass';
          filter.frequency.value = 1000;
          filter.Q.value = 2;
          
          const distortion = ctx.createWaveShaper();
          const samples = 44100;
          const curve = new Float32Array(samples);
          for (let i = 0; i < samples; i++) {
              const x = (i * 2) / samples - 1;
              curve[i] = ((3 + 50) * x * 20 * Math.PI / 180) / (Math.PI + 50 * Math.abs(x));
          }
          distortion.curve = curve;
          distortion.oversample = '4x';
          
          current.connect(filter);
          filter.connect(distortion);
          current = distortion;
      } 
      else if (activeEffect === 'robot') {
          // Robot effect: delay + resonance
          const delay = ctx.createDelay(0.1);
          delay.delayTime.value = 0.03;
          
          const feedback = ctx.createGain();
          feedback.gain.value = 0.3;
          
          current.connect(delay);
          delay.connect(feedback);
          feedback.connect(delay);
          
          const mix = ctx.createGain();
          mix.gain.value = 0.5;
          delay.connect(mix);
          current = mix;
      }
      else if (activeEffect === 'ethereal') {
          // Ethereal effect: reverb simulation
          const delay1 = ctx.createDelay(0.5);
          const delay2 = ctx.createDelay(0.5);
          const feedback = ctx.createGain();
          
          delay1.delayTime.value = 0.15;
          delay2.delayTime.value = 0.35;
          feedback.gain.value = 0.4;
          
          current.connect(delay1);
          delay1.connect(delay2);
          delay2.connect(feedback);
          feedback.connect(delay1);
          
          const dryWet = ctx.createGain();
          dryWet.gain.value = 0.6;
          delay1.connect(dryWet);
          delay2.connect(dryWet);
          current = dryWet;
      }

      // Echo amount control
      if (echoAmount > 0) {
          const echoDelay = ctx.createDelay(1);
          const echoFeedback = ctx.createGain();
          const echoMix = ctx.createGain();
          
          echoDelay.delayTime.value = 0.3;
          echoFeedback.gain.value = echoAmount * 0.5;
          echoMix.gain.value = echoAmount;
          
          current.connect(echoDelay);
          echoDelay.connect(echoFeedback);
          echoFeedback.connect(echoDelay);
          echoDelay.connect(echoMix);
          echoMix.connect(destination);
          current.connect(destination);
      } else {
          current.connect(destination);
      }
  };

  // Play selected audio
  const playSound = (buffer: AudioBuffer | null) => {
      if (!buffer || !audioContextRef.current) return;
      
      const ctx = audioContextRef.current;
      if (sourceRef.current) sourceRef.current.stop();
      
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.playbackRate.value = pitchShift;
      
      const masterGain = ctx.createGain();
      masterGain.gain.value = 1.0;

      applyEffectsChain(ctx, source, masterGain);
      
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

  return (
    <div className="h-full flex flex-col bg-forge-dark overflow-hidden">
      {/* Header */}
      <div className="p-6 border-b border-slate-700 bg-forge-panel flex justify-between items-center">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-purple-500/20 rounded-xl border border-purple-500/30">
                <Music className="w-6 h-6 text-purple-400" />
            </div>
            <div>
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                    Audio Studio <span className="text-[10px] bg-slate-800 px-2 py-0.5 rounded text-slate-400 border border-slate-700">PRO</span>
                </h2>
                <p className="text-xs text-slate-400 font-mono">Mod Audio Creation & Processing</p>
            </div>
          </div>
          <div className="flex gap-2">
              <div className="flex items-center gap-2 px-3 py-1 bg-slate-800 rounded-full border border-slate-600 text-xs text-slate-300">
                  <Activity className="w-3 h-3 text-purple-400" />
                  Audio Ready
              </div>
          </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
          {/* Main Content */}
          <div className="flex-1 flex flex-col p-6 gap-6 overflow-y-auto">
              
              {/* Audio File Manager */}
              <div className="bg-forge-panel border border-slate-700 rounded-xl p-6">
                  <div className="flex items-center justify-between mb-4">
                      <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
                          <FileAudio className="w-4 h-4" /> Audio Files
                      </h3>
                      <button
                          onClick={() => fileInputRef.current?.click()}
                          className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-sm font-bold flex items-center gap-2 transition-colors"
                      >
                          <Upload className="w-4 h-4" /> Load Audio
                      </button>
                      <input
                          ref={fileInputRef}
                          type="file"
                          accept="audio/*"
                          onChange={handleFileUpload}
                          className="hidden"
                      />
                  </div>
                  
                  {audioFiles.length > 0 ? (
                      <div className="space-y-2">
                          {audioFiles.map((file, idx) => (
                              <div
                                  key={idx}
                                  onClick={() => {
                                      setSelectedFile(idx);
                                      setAudioBuffer(file.buffer);
                                  }}
                                  className={`p-3 rounded-lg border cursor-pointer transition-all flex justify-between items-center ${
                                      selectedFile === idx
                                          ? 'bg-purple-500/20 border-purple-500 shadow-md'
                                          : 'bg-slate-900 border-slate-700 hover:border-slate-600'
                                  }`}
                              >
                                  <div className="flex items-center gap-3 flex-1">
                                      <FileAudio className="w-4 h-4 text-purple-400" />
                                      <div className="flex-1">
                                          <div className="text-sm font-bold text-slate-200">{file.name}</div>
                                          <div className="text-xs text-slate-400">{file.duration.toFixed(2)}s</div>
                                      </div>
                                  </div>
                                  <button
                                      onClick={(e) => {
                                          e.stopPropagation();
                                          setAudioFiles(audioFiles.filter((_, i) => i !== idx));
                                          if (selectedFile === idx) setSelectedFile(null);
                                      }}
                                      className="p-2 hover:bg-red-500/20 text-red-400 rounded transition-colors"
                                  >
                                      <Trash2 className="w-4 h-4" />
                                  </button>
                              </div>
                          ))}
                      </div>
                  ) : (
                      <div className="text-center py-8 text-slate-500">
                          <FileAudio className="w-12 h-12 mx-auto mb-2 opacity-30" />
                          <p className="text-sm">No audio files loaded. Click "Load Audio" to begin.</p>
                      </div>
                  )}
              </div>

              {/* Visualizer */}
              <div className="flex-1 bg-black rounded-xl border border-slate-700 relative overflow-hidden flex flex-col">
                   <div className="absolute top-4 left-4 z-10 text-xs font-mono text-slate-500 flex items-center gap-2">
                       <Activity className="w-3 h-3" /> FREQUENCY ANALYZER
                   </div>
                   
                   <canvas ref={canvasRef} width={800} height={300} className="w-full h-full opacity-90" />
                   
                   <div className="absolute bottom-0 left-0 w-full p-4 bg-gradient-to-t from-black to-transparent flex justify-center items-end pb-8">
                       <button 
                           onClick={() => playSound(audioBuffer)}
                           disabled={!audioBuffer || isPlaying}
                           className="w-16 h-16 rounded-full bg-white text-black flex items-center justify-center hover:scale-105 transition-transform disabled:opacity-20 disabled:scale-100 shadow-[0_0_30px_rgba(255,255,255,0.3)]"
                       >
                           <Play className="w-6 h-6 fill-current" />
                       </button>
                   </div>
              </div>
          </div>

          {/* Right Panel: Processing Controls */}
          <div className="w-80 bg-slate-900 border-l border-slate-800 p-6 flex flex-col gap-4 overflow-y-auto">
              {/* Audio Quality */}
              <div>
                  <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                      <Settings className="w-4 h-4" /> Quality
                  </h4>
                  <select
                      value={audioQuality}
                      onChange={(e) => setAudioQuality(e.target.value as any)}
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-slate-200 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  >
                      <option value="16bit-22k">16-bit 22 kHz (Dialogue)</option>
                      <option value="16bit-44k">16-bit 44.1 kHz (Standard)</option>
                      <option value="24bit-48k">24-bit 48 kHz (High-Fidelity)</option>
                  </select>
              </div>

              {/* Volume Control */}
              <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 block">
                      Volume: {(volumeLevel * 100).toFixed(0)}%
                  </label>
                  <input
                      type="range"
                      min="0"
                      max="200"
                      value={volumeLevel * 100}
                      onChange={(e) => setVolumeLevel(parseInt(e.target.value) / 100)}
                      className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer"
                  />
              </div>

              {/* Pitch Shift */}
              <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 block">
                      Pitch: {(pitchShift * 100).toFixed(0)}%
                  </label>
                  <input
                      type="range"
                      min="50"
                      max="200"
                      value={pitchShift * 100}
                      onChange={(e) => setPitchShift(parseInt(e.target.value) / 100)}
                      className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer"
                  />
              </div>

              {/* Echo Amount */}
              <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 block">
                      Echo: {(echoAmount * 100).toFixed(0)}%
                  </label>
                  <input
                      type="range"
                      min="0"
                      max="100"
                      value={echoAmount * 100}
                      onChange={(e) => setEchoAmount(parseInt(e.target.value) / 100)}
                      className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer"
                  />
              </div>

              {/* Effects */}
              <div>
                  <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                      <Sliders className="w-4 h-4" /> Effects
                  </h4>

                  {[
                      { id: 'none', icon: Volume2, label: 'Clean', desc: 'No effects' },
                      { id: 'radio', icon: Radio, label: 'Radio', desc: 'Bandpass + Drive' },
                      { id: 'robot', icon: Cpu, label: 'Robot', desc: 'Delay + Resonance' },
                      { id: 'ethereal', icon: Music, label: 'Reverb', desc: 'Ethereal Space' }
                  ].map((effect) => (
                      <button 
                          key={effect.id}
                          onClick={() => setActiveEffect(effect.id as any)}
                          className={`w-full p-3 rounded-lg border transition-all text-left mb-2 ${
                              activeEffect === effect.id 
                                  ? 'bg-purple-500/20 border-purple-500 shadow-md' 
                                  : 'bg-slate-800 border-slate-700 hover:border-slate-600'
                          }`}
                      >
                          <div className="flex items-center gap-2">
                              <effect.icon className="w-4 h-4 text-purple-400" />
                              <div className="flex-1">
                                  <div className="font-bold text-slate-200 text-sm">{effect.label}</div>
                                  <div className="text-xs text-slate-500">{effect.desc}</div>
                              </div>
                          </div>
                      </button>
                  ))}
              </div>

              {/* Export Section */}
              <div className="mt-auto pt-6 border-t border-slate-800 space-y-3">
                  <button 
                      onClick={exportToWAV}
                      disabled={!audioBuffer}
                      className="w-full py-3 bg-purple-600 hover:bg-purple-500 disabled:opacity-30 disabled:cursor-not-allowed text-white rounded-lg flex items-center justify-center gap-2 text-sm font-bold transition-colors"
                  >
                      <Download className="w-4 h-4" /> 
                      Export to WAV
                  </button>
                  
                  <button 
                      onClick={() => setModPath(prompt('Enter mod folder path:') || '')}
                      className="w-full py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg flex items-center justify-center gap-2 text-xs font-bold transition-colors"
                  >
                      <Folder className="w-4 h-4" />
                      Set Mod Path
                  </button>
                  
                  {modPath && (
                      <div className="text-xs text-slate-400 bg-slate-800 p-2 rounded border border-slate-700 break-all">
                          {modPath}
                      </div>
                  )}
              </div>
          </div>
      </div>
    </div>
  );
};

export default AudioStudio;