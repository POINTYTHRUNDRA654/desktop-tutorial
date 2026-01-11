import React, { useRef, useState } from 'react';
import { Mic, MicOff, Wifi, Cpu, Power, Maximize2, Minimize2, Sparkles, Image as ImageIcon, Upload, Trash2 } from 'lucide-react';
import { useLive } from './LiveContext';
import AvatarCore from './AvatarCore';

const LiveInterface: React.FC = () => {
  const { isActive, status, volume, mode, transcription, connect, disconnect, customAvatar, updateAvatar, clearAvatar } = useLive();
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Handle Image Upload
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) updateAvatar(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(true);
  };

  const handleDragLeave = () => setIsDragging(false);

  const handleDrop = (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file && file.type.startsWith('image/')) {
          updateAvatar(file);
      }
  };

  return (
    <div 
        className={`h-full flex flex-col bg-[#050505] text-slate-200 relative overflow-hidden transition-all duration-500 ${isFullscreen ? 'fixed inset-0 z-50' : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
    >
      
      {/* Background Ambience */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-[#0f172a] via-[#050505] to-[#000000] z-0 pointer-events-none"></div>
      
      {/* Drag Overlay */}
      {isDragging && (
          <div className="absolute inset-0 z-50 bg-emerald-500/20 backdrop-blur-sm border-4 border-emerald-500 border-dashed m-4 rounded-3xl flex items-center justify-center pointer-events-none">
              <div className="text-2xl font-bold text-white flex items-center gap-4 animate-bounce">
                  <Upload className="w-12 h-12" /> Drop Image to Set Avatar
              </div>
          </div>
      )}

      {/* Header HUD */}
      <div className="absolute top-0 left-0 w-full p-6 flex justify-between items-start z-20 pointer-events-auto">
          <div className="flex flex-col gap-1">
              <h2 className="text-2xl font-bold text-white tracking-widest flex items-center gap-2">
                  MOSSY <span className="text-[10px] bg-slate-800 px-2 py-0.5 rounded text-emerald-400 border border-emerald-900">LIVE</span>
              </h2>
              <div className="flex items-center gap-4 text-xs font-mono text-slate-500">
                  <span className="flex items-center gap-1"><Cpu className="w-3 h-3" /> CORE: ACTIVE</span>
                  <span className="flex items-center gap-1"><Wifi className="w-3 h-3" /> LATENCY: 12ms</span>
              </div>
          </div>
          
          <div className="flex items-center gap-2">
              {/* Avatar Upload Control */}
              <div className="relative group">
                  <input 
                      type="file" 
                      ref={fileInputRef} 
                      className="hidden" 
                      accept="image/*" 
                      onChange={handleImageUpload} 
                  />
                  <button 
                      onClick={() => fileInputRef.current?.click()}
                      className="p-2 bg-slate-800 hover:bg-slate-700 rounded-full text-slate-400 hover:text-white transition-colors"
                      title="Upload Custom Avatar"
                  >
                      <ImageIcon className="w-4 h-4" />
                  </button>
                  {customAvatar && (
                      <button 
                          onClick={clearAvatar}
                          className="absolute -bottom-8 right-0 p-2 bg-red-900/80 hover:bg-red-700 rounded-full text-white text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                          title="Reset Avatar"
                      >
                          <Trash2 className="w-3 h-3" />
                      </button>
                  )}
              </div>

              <div className={`px-3 py-1 rounded-full border text-xs font-bold uppercase tracking-wider flex items-center gap-2 ${
                  isActive ? 'bg-emerald-900/20 border-emerald-500/50 text-emerald-400' : 'bg-red-900/20 border-red-500/50 text-red-400'
              }`}>
                  <div className={`w-2 h-2 rounded-full ${isActive ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`}></div>
                  {status}
              </div>
              <button onClick={() => setIsFullscreen(!isFullscreen)} className="p-2 bg-slate-800 hover:bg-slate-700 rounded-full text-slate-400 hover:text-white transition-colors">
                  {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              </button>
          </div>
      </div>

      {/* Main Hologram Stage */}
      <div className="flex-1 relative z-10 flex items-center justify-center">
          
          {/* Avatar Rendering Core */}
          <div className="w-full h-full flex items-center justify-center relative">
              <AvatarCore className="w-full h-full max-w-2xl max-h-2xl" showRings={true} />
              
              {/* Status Overlay Text */}
              {isActive && (
                  <div className="absolute bottom-20 left-1/2 -translate-x-1/2 text-xs font-mono text-slate-400 uppercase tracking-widest bg-black/50 px-3 py-1 rounded-full backdrop-blur">
                      {mode}
                  </div>
              )}
          </div>
          
          {/* Start Button Overlay (if inactive) */}
          {!isActive && (
              <div className="absolute inset-0 flex items-center justify-center z-20">
                  <button 
                      onClick={connect}
                      className="group relative"
                  >
                      <div className="absolute inset-0 bg-emerald-500 rounded-full blur-xl opacity-20 group-hover:opacity-40 transition-opacity duration-500 animate-pulse"></div>
                      <div className="w-24 h-24 rounded-full border-2 border-emerald-500/30 bg-black/60 backdrop-blur-md flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                          <Power className="w-8 h-8 text-emerald-400 fill-emerald-400/20" />
                      </div>
                      <div className="absolute -bottom-10 left-1/2 -translate-x-1/2 text-xs font-mono text-emerald-500 tracking-widest opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                          INITIALIZE SYSTEM
                      </div>
                  </button>
              </div>
          )}
      </div>

      {/* Footer Interface */}
      <div className="absolute bottom-0 left-0 w-full p-8 z-20 flex flex-col items-center gap-6 pointer-events-auto bg-gradient-to-t from-black via-black/80 to-transparent">
          
          {/* Transcript Log */}
          {isActive && (
              <div className="w-full max-w-2xl text-center space-y-2">
                  <div className="h-px w-full bg-gradient-to-r from-transparent via-emerald-900 to-transparent mb-4"></div>
                  <div className="font-mono text-sm text-emerald-400/80 tracking-wide animate-pulse">
                      {transcription || "Awaiting input..."}
                  </div>
                  <div className="text-[10px] text-slate-600 font-mono uppercase flex items-center justify-center gap-2">
                      <Sparkles className="w-3 h-3" />
                      {mode === 'listening' ? 'MIC ARRAY ACTIVE' : mode === 'speaking' ? 'AUDIO OUT ACTIVE' : 'IDLE'}
                  </div>
              </div>
          )}

          {/* Controls */}
          {isActive && (
              <div className="flex gap-4">
                  <button 
                      className={`p-4 rounded-full border transition-all duration-300 ${
                          mode === 'listening' ? 'bg-amber-500/10 border-amber-500 text-amber-400' : 'bg-slate-800 border-slate-700 text-slate-400'
                      }`}
                  >
                      {mode === 'listening' ? <Mic className="w-6 h-6 animate-pulse" /> : <MicOff className="w-6 h-6" />}
                  </button>
                  <button 
                      onClick={disconnect}
                      className="p-4 rounded-full bg-red-500/10 hover:bg-red-500/20 border border-red-500 text-red-400 transition-all hover:scale-105"
                  >
                      <Power className="w-6 h-6" />
                  </button>
              </div>
          )}
      </div>
    </div>
  );
};

export default LiveInterface;