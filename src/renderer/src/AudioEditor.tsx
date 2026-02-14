import React, { useEffect, useRef, useState } from 'react';
import { Play, StopCircle, Pause, Plus, Upload, Save, Music, Volume2, FileAudio } from 'lucide-react';
import './AudioEditor.css';

// Lightweight UI-side types (keep in sync with shared types)
type AudioFormat = 'xwm' | 'fuz' | 'wav' | 'mp3' | 'ogg';
type SoundCategory = 'FX' | 'Voice' | 'Music' | 'Ambient' | 'UI' | 'Footstep';

type AudioFile = {
  id: string;
  name: string;
  path?: string;
  format: AudioFormat;
  duration: number; // seconds
  sampleRate: number;
  bitrate: number;
  channels: 1 | 2;
  fileSize: string; // human readable
  category?: SoundCategory;
};

type Descriptor = {
  name: string;
  category: SoundCategory;
  looping: boolean;
  volume: number;
  pitch: number;
};

export const AudioEditor: React.FC = () => {
  const [library, setLibrary] = useState<AudioFile[]>([
    { id: 'a1', name: 'Voice - Dialogue', format: 'wav', duration: 12.34, sampleRate: 44100, bitrate: 192, channels: 2, fileSize: '1.2 MB', category: 'Voice' },
    { id: 'a2', name: 'Music - Combat', format: 'mp3', duration: 45.0, sampleRate: 44100, bitrate: 256, channels: 2, fileSize: '3.8 MB', category: 'Music' },
    { id: 'a3', name: 'SFX - Weapon', format: 'wav', duration: 0.8, sampleRate: 44100, bitrate: 1411, channels: 1, fileSize: '120 KB', category: 'FX' },
  ]);

  const [selectedId, setSelectedId] = useState<string | null>(library[0].id);
  const [playing, setPlaying] = useState(false);
  const [volume, setVolume] = useState(0.75);
  const [progress, setProgress] = useState(0); // seconds
  const [descriptor, setDescriptor] = useState<Descriptor>({ name: 'MySound', category: 'FX', looping: false, volume: 0.9, pitch: 1 });
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const selected = library.find((f) => f.id === selectedId) ?? null;

  // Mock playback timer
  useEffect(() => {
    if (!playing || !selected) return;
    const step = 0.2;
    const t = setInterval(() => {
      setProgress((p) => {
        const next = p + step;
        if (next >= selected.duration) {
          setPlaying(false);
          clearInterval(t);
          return selected.duration;
        }
        return next;
      });
    }, step * 1000);
    return () => clearInterval(t);
  }, [playing, selected]);

  useEffect(() => {
    // Draw a simple placeholder waveform based on duration
    const canvas = canvasRef.current;
    if (!canvas || !selected) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    canvas.width = Math.max(640, rect.width * devicePixelRatio);
    canvas.height = Math.max(160, rect.height * devicePixelRatio);
    ctx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);

    // background
    ctx.fillStyle = '#071727';
    ctx.fillRect(0, 0, rect.width, rect.height);

    // waveform - synthetic
    ctx.strokeStyle = '#60a5fa';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    const steps = 120;
    for (let i = 0; i < steps; i++) {
      const x = (i / (steps - 1)) * rect.width;
      const phase = (i / steps) * Math.PI * 2 * (selected.duration % 5);
      const mag = Math.abs(Math.sin(phase)) * (0.3 + (i % 7) / 20);
      const y = rect.height / 2 + (mag * rect.height) / 3 * (i % 2 ? -1 : 1);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();

    // progress marker
    ctx.fillStyle = 'rgba(255,255,255,0.08)';
    const px = (progress / Math.max(1, selected.duration)) * rect.width;
    ctx.fillRect(0, 0, px, rect.height);
  }, [selected, progress]);

  // Drag & drop import
  const onImport = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const f = files[0];
    const newFile: AudioFile = {
      id: `u_${Date.now()}`,
      name: f.name,
      path: undefined,
      format: (f.name.endsWith('.wav') ? 'wav' : f.name.endsWith('.mp3') ? 'mp3' : 'wav') as AudioFormat,
      duration: 3.2,
      sampleRate: 44100,
      bitrate: 192,
      channels: 2,
      fileSize: `${Math.round(f.size / 1024)} KB`,
      category: 'FX',
    };
    setLibrary((L) => [newFile, ...L]);
    setSelectedId(newFile.id);
  };

  // Action handlers (call electronAPI if available, otherwise operate locally)
  const handleConvertToXWM = async () => {
    if (!selected) return;
    const api = (window as any).electronAPI ?? (window as any).electron?.api;
    if (api?.audioEditor?.convertToXWM) {
      try {
        const resp = await api.audioEditor.convertToXWM(selected.path || selected.name, 90);
        if (resp?.success) alert(`Converted → ${resp.outputPath}`);
      } catch (err) {
        alert('Conversion failed');
      }
      return;
    }
    // local stub feedback
    alert('Converted locally (stub) → ' + selected.name.replace(/\.[^.]+$/, '.xwm'));
  };

  const handleGenerateLipSync = async () => {
    if (!selected) return;
    const api = (window as any).electronAPI ?? (window as any).electron?.api;
    if (api?.audioEditor?.generateLipSync) {
      const lip = await api.audioEditor.generateLipSync(selected.path || selected.name, 'Hello world');
      alert('Lip file generated: ' + JSON.stringify(lip));
      return;
    }
    alert('Lip-Sync (stub) generated for ' + selected.name);
  };

  const handleNormalize = async () => {
    const api = (window as any).electronAPI ?? (window as any).electron?.api;
    if (api?.audioEditor?.normalizeVolume) {
      await api.audioEditor.normalizeVolume([selected?.path || selected?.name]);
      alert('Normalization complete');
      return;
    }
    alert('Normalization (stub) complete');
  };

  const handleRemoveNoise = async () => {
    if (!selected) return;
    const api = (window as any).electronAPI ?? (window as any).electron?.api;
    if (api?.audioEditor?.removeNoise) {
      const out = await api.audioEditor.removeNoise(selected.path || selected.name, 0.6);
      alert('Noise removal output: ' + out);
      return;
    }
    alert('Noise removal (stub) complete');
  };

  const handleSaveDescriptor = () => {
    // naive save into local state (would call engine/preload in a real app)
    alert('Descriptor saved: ' + JSON.stringify(descriptor));
  };

  return (
    <div className="audio-editor" data-testid="audio-editor">
      <div className="left-panel">
        <div className="panel-header"><h3>Audio Library</h3><div className="legend">Search · Drag & drop · Bulk</div></div>
        <div className="library-controls">
          <div style={{display:'flex',gap:8}}>
            <input className="form-input" placeholder="Search audio..." />
            <label className="import-btn">
              <Upload size={14} />
              <input type="file" accept="audio/*" style={{display:'none'}} onChange={(e) => onImport(e.target.files)} />
            </label>
          </div>
        </div>

        <div className="categories">
          <div className="category-title">Voice</div>
          {library.filter(l => l.category==='Voice').map(l => (
            <div key={l.id} className={`lib-item ${l.id===selectedId? 'selected':''}`} onClick={() => { setSelectedId(l.id); setProgress(0); }}>
              <div style={{fontSize:13}}>{l.name}</div>
              <div className="meta">{l.duration.toFixed(2)}s</div>
            </div>
          ))}

          <div className="category-title">Music</div>
          {library.filter(l => l.category==='Music').map(l => (
            <div key={l.id} className={`lib-item ${l.id===selectedId? 'selected':''}`} onClick={() => { setSelectedId(l.id); setProgress(0); }}>
              <div style={{fontSize:13}}>{l.name}</div>
              <div className="meta">{l.duration.toFixed(0)}s</div>
            </div>
          ))}

          <div className="category-title">SFX</div>
          {library.filter(l => l.category==='FX').map(l => (
            <div key={l.id} className={`lib-item ${l.id===selectedId? 'selected':''}`} onClick={() => { setSelectedId(l.id); setProgress(0); }}>
              <div style={{fontSize:13}}>{l.name}</div>
              <div className="meta">{l.fileSize}</div>
            </div>
          ))}
        </div>

        <div className="left-footer">
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
            <div className="legend">Drag files here to import</div>
            <div style={{display:'flex',gap:8}}>
              <button className="small-btn" onClick={() => alert('Bulk import (stub)')}><Plus size={14}/> Import</button>
            </div>
          </div>
        </div>
      </div>

      <div className="center-panel">
        <div className="center-header"><div style={{fontWeight:700}}>{selected ? `${selected.name}` : 'No file selected'}</div></div>

        <div className="waveform-area">
          <div className="waveform-canvas" onDoubleClick={() => alert('Open full waveform editor (stub)')}>
            <canvas ref={canvasRef} style={{width:'100%',height:180,borderRadius:8,display:'block'}} />
          </div>

          <div className="playback-controls">
            <div style={{display:'flex',gap:8,alignItems:'center'}}>
              <button className="tool-btn" onClick={() => { setPlaying(true); }} title="Play"><Play size={16} /></button>
              <button className="tool-btn" onClick={() => { setPlaying(false); setProgress(0); }} title="Stop"><StopCircle size={16} /></button>
              <button className="tool-btn" onClick={() => setPlaying((p) => !p)} title="Pause"><Pause size={16} /></button>
            </div>
            <div style={{display:'flex',gap:12,alignItems:'center'}}>
              <div>Duration: <strong>{selected ? `${Math.floor(selected.duration/60)}:${String(Math.floor(selected.duration%60)).padStart(2,'0')}` : '00:00'}</strong></div>
              <div style={{display:'flex',gap:8,alignItems:'center'}}><Volume2 size={14}/> <input type="range" min={0} max={1} step={0.01} value={volume} onChange={(e)=>setVolume(Number(e.target.value))} /></div>
            </div>
          </div>

          <div className="actions">
            <button className="btn-ghost" onClick={handleConvertToXWM}><Save size={14}/> Convert to XWM</button>
            <button className="btn-ghost" onClick={handleGenerateLipSync}><FileAudio size={14}/> Generate Lip-Sync</button>
            <button className="btn-ghost" onClick={handleNormalize}>Normalize Volume</button>
            <button className="btn-ghost" onClick={handleRemoveNoise}>Remove Noise</button>
          </div>
        </div>
      </div>

      <div className="right-panel">
        <div className="prop-card">
          <h4>Audio Properties</h4>
          {!selected && <div className="empty-note">Select an audio file to see properties</div>}
          {selected && (
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
              <div>Format:<div className="meta">{selected.format.toUpperCase()}</div></div>
              <div>Sample Rate:<div className="meta">{selected.sampleRate} Hz</div></div>
              <div>Bitrate:<div className="meta">{selected.bitrate} kbps</div></div>
              <div>Channels:<div className="meta">{selected.channels === 2 ? 'Stereo' : 'Mono'}</div></div>
              <div>File Size:<div className="meta">{selected.fileSize}</div></div>
              <div>Path:<div className="meta">{selected.path ?? 'local'}</div></div>
            </div>
          )}
        </div>

        <div className="prop-card">
          <h4>Sound Descriptor Editor</h4>
          <div style={{display:'flex',gap:8,alignItems:'center'}}>
            <input className="form-input" value={descriptor.name} onChange={(e)=>setDescriptor({...descriptor,name:e.target.value})} />
            <select className="form-input" value={descriptor.category} onChange={(e)=>setDescriptor({...descriptor,category:e.target.value as SoundCategory})}>
              <option>FX</option>
              <option>Voice</option>
              <option>Music</option>
              <option>Ambient</option>
              <option>UI</option>
              <option>Footstep</option>
            </select>
          </div>
          <div style={{display:'flex',gap:8,alignItems:'center',marginTop:8}}>
            <label style={{display:'flex',gap:8,alignItems:'center'}}><input type="checkbox" checked={descriptor.looping} onChange={(e)=>setDescriptor({...descriptor,looping:e.target.checked})}/> Looping</label>
            <div style={{flex:1}}>
              <label style={{fontSize:12,color:'#94a3b8'}}>Volume</label>
              <input type="range" min={0} max={1} step={0.01} value={descriptor.volume} onChange={(e)=>setDescriptor({...descriptor,volume:Number(e.target.value)})} />
            </div>
          </div>
          <div style={{marginTop:8}}>
            <label style={{fontSize:12,color:'#94a3b8'}}>Pitch</label>
            <input type="range" min={0.25} max={2} step={0.01} value={descriptor.pitch} onChange={(e)=>setDescriptor({...descriptor,pitch:Number(e.target.value)})} />
          </div>

          <div style={{marginTop:12,display:'flex',gap:8}}>
            <button className="btn-primary" onClick={handleSaveDescriptor}><Save size={14}/> Save Descriptor</button>
            <button className="btn-ghost" onClick={() => alert('Test in-game (stub)')}>Test In-Game</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AudioEditor;
