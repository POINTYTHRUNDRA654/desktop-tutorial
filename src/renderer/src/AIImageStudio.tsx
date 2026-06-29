import React, { useState, useEffect, useRef } from 'react';
import {
  Wand2, Upload, Download, RefreshCw, ImageIcon, Zap,
  AlertCircle, Loader2, ChevronDown, ChevronUp, Camera, Copy,
  Package, CheckCircle2, XCircle, BookOpen, RotateCcw,
} from 'lucide-react';

const bridge: any = (window as any).electron?.api || (window as any).electronAPI;

const STYLE_PRESETS = [
  { label: 'Photorealistic', tokens: 'hyperrealistic, 8k uhd, professional photography, sharp focus, cinematic lighting, highly detailed, RAW photo' },
  { label: 'FO4 Wasteland', tokens: 'fallout 4 concept art, post-apocalyptic, retro-futuristic, Commonwealth wasteland, worn and weathered, grungy atmosphere' },
  { label: 'Surface Texture', tokens: 'seamless tileable texture, flat diffuse lighting, no specular highlights, no shadows, pbr diffuse map, material reference' },
  { label: 'Architecture', tokens: 'architectural visualization, ambient occlusion baked, photorealistic rendering, detailed materials, professional photography' },
  { label: 'Character Portrait', tokens: 'professional portrait photography, studio lighting, sharp focus, detailed skin texture, 85mm lens, shallow depth of field' },
];

const RESOLUTIONS = [
  { label: '512x512',   w: 512,  h: 512,  hint: 'Fast'      },
  { label: '768x768',   w: 768,  h: 768,  hint: 'Balanced'  },
  { label: '1024x1024', w: 1024, h: 1024, hint: 'Quality'   },
  { label: '1216x832',  w: 1216, h: 832,  hint: 'Landscape' },
  { label: '832x1216',  w: 832,  h: 1216, hint: 'Portrait'  },
];

const RECOMMENDED_MODELS = [
  {
    id: 'juggernautxl',
    name: 'JuggernautXL v9',
    filename: 'Juggernaut-XL_v9_RunDiffusionPhoto_v2.safetensors',
    url: 'https://huggingface.co/RunDiffusion/Juggernaut-XL-v9/resolve/main/Juggernaut-XL_v9_RunDiffusionPhoto_v2.safetensors',
    sizeMB: 6800,
    license: 'SDXL Community License — Free',
    description: 'Best all-round photorealism for landscapes, portraits, and materials',
    tag: 'Top Pick',
  },
  {
    id: 'realvisxl',
    name: 'RealVisXL V4.0',
    filename: 'RealVisXL_V4.0.safetensors',
    url: 'https://huggingface.co/SG161222/RealVisXL_V4.0/resolve/main/RealVisXL_V4.0.safetensors',
    sizeMB: 6770,
    license: 'OpenRAIL++ — Free',
    description: 'Hyper-realistic skin, fabric, and surface detail — excellent for FO4 characters',
    tag: 'Photorealism',
  },
];

const DEFAULT_NEGATIVE =
  'blurry, low quality, watermark, text, signature, deformed, ugly, bad anatomy, ' +
  'disfigured, mutation, extra limbs, poorly drawn, jpeg artifacts, noise, grainy, ' +
  'out of focus, overexposed, underexposed';

type Mode = 'generate' | 'transform' | 'library';
type ComfyStatus = 'checking' | 'online' | 'offline';
type DlState = 'idle' | 'downloading' | 'restarting' | 'done' | 'error';

interface DlProgress { percent: number; received: number; total: number }

const AIImageStudio: React.FC = () => {
  const [comfyStatus, setComfyStatus] = useState<ComfyStatus>('checking');
  const [models, setModels]           = useState<string[]>([]);
  const [selectedModel, setSelectedModel] = useState('');

  const [mode, setMode]           = useState<Mode>('generate');
  const [prompt, setPrompt]       = useState('');
  const [negPrompt, setNegPrompt] = useState(DEFAULT_NEGATIVE);
  const [showNeg, setShowNeg]     = useState(false);

  const [resIdx, setResIdx]   = useState(2);
  const [steps, setSteps]     = useState(30);
  const [cfg, setCfg]         = useState(7);
  const [denoise, setDenoise] = useState(0.65);

  const [sourceImage, setSourceImage] = useState<string | null>(null);
  const [sourceFile, setSourceFile]   = useState<File | null>(null);

  const [resultImage, setResultImage] = useState<string | null>(null);
  const [generating, setGenerating]   = useState(false);
  const [statusMsg, setStatusMsg]     = useState('');
  const [error, setError]             = useState('');

  const [installedFiles, setInstalledFiles] = useState<string[]>([]);
  const [dlStates, setDlStates]     = useState<Record<string, DlState>>({});
  const [dlProgress, setDlProgress] = useState<Record<string, DlProgress>>({});
  const [dlErrors, setDlErrors]     = useState<Record<string, string>>({});
  const [restartElapsed, setRestartElapsed] = useState<Record<string, number>>({});
  const [startingComfy, setStartingComfy] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { void checkComfyUI(); }, []);

  useEffect(() => {
    if (mode === 'library') void refreshInstalled();
  }, [mode]);

  useEffect(() => {
    if (!bridge?.on) return;
    const c1 = bridge.on(
      'textures:download-progress',
      (data: { filename: string; percent: number; received: number; total: number }) => {
        setDlProgress(prev => ({
          ...prev,
          [data.filename]: { percent: data.percent, received: data.received, total: data.total },
        }));
      },
    );
    const c2 = bridge.on(
      'textures:comfyui-restart-progress',
      (data: { elapsed: number }) => {
        // Update elapsed for any model currently in 'restarting' state
        setRestartElapsed(prev => {
          const next = { ...prev };
          Object.keys(next).forEach(id => { next[id] = data.elapsed; });
          return next;
        });
      },
    );
    return () => { c1?.(); c2?.(); };
  }, []);

  const checkComfyUI = async () => {
    setComfyStatus('checking');
    try {
      const r = await bridge.invoke('textures:comfyui-status');
      if (r.online) {
        setComfyStatus('online');
        const mr = await bridge.invoke('textures:comfyui-models');
        if (mr.success && mr.models.length > 0) {
          setModels(mr.models);
          setSelectedModel(mr.models[0]);
        }
      } else {
        setComfyStatus('offline');
      }
    } catch {
      setComfyStatus('offline');
    }
  };

  const handleStartComfy = async () => {
    setStartingComfy(true);
    try {
      await bridge.invoke('textures:comfyui-restart');
      await checkComfyUI();
    } catch {
      // checkComfyUI will set status to offline if it fails
    } finally {
      setStartingComfy(false);
    }
  };

  const refreshInstalled = async () => {
    try {
      const r = await bridge.invoke('textures:comfyui-list-checkpoints');
      if (r.success) setInstalledFiles((r.files as any[]).map((f: any) => f.name));
    } catch {}
  };

  const downloadModel = async (model: typeof RECOMMENDED_MODELS[0]) => {
    setDlStates(prev => ({ ...prev, [model.id]: 'downloading' }));
    setDlErrors(prev => { const n = { ...prev }; delete n[model.id]; return n; });
    setDlProgress(prev => ({ ...prev, [model.filename]: { percent: 0, received: 0, total: 0 } }));

    try {
      const r = await bridge.invoke('textures:comfyui-download-model', {
        url: model.url,
        filename: model.filename,
      });

      if (!r?.success) {
        setDlStates(prev => ({ ...prev, [model.id]: 'error' }));
        setDlErrors(prev => ({ ...prev, [model.id]: r?.error || 'Download failed' }));
        return;
      }

      // Auto-restart ComfyUI so the model loads
      setDlStates(prev => ({ ...prev, [model.id]: 'restarting' }));
      setRestartElapsed(prev => ({ ...prev, [model.id]: 0 }));

      const restart = await bridge.invoke('textures:comfyui-restart');

      if (restart?.success) {
        setDlStates(prev => ({ ...prev, [model.id]: 'done' }));
        await refreshInstalled();
        await checkComfyUI();
      } else {
        // Restart failed but download succeeded — not a hard error
        setDlStates(prev => ({ ...prev, [model.id]: 'done' }));
        setDlErrors(prev => ({
          ...prev,
          [model.id]: 'Downloaded. Start ComfyUI manually to load the model.',
        }));
        await refreshInstalled();
      }
    } catch (e: any) {
      setDlStates(prev => ({ ...prev, [model.id]: 'error' }));
      setDlErrors(prev => ({ ...prev, [model.id]: e.message }));
    }
  };

  const applyPreset = (tokens: string) =>
    setPrompt(prev => (prev ? prev + ', ' : '') + tokens);

  const readFileAsB64 = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload  = () => resolve((reader.result as string).split(',')[1]);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

  const loadPreview = (file: File) => {
    setSourceFile(file);
    const reader = new FileReader();
    reader.onload = ev => setSourceImage(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) loadPreview(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) loadPreview(file);
  };

  const handleGenerate = async () => {
    setError('');
    if (!selectedModel)                        { setError('No model selected. Is ComfyUI running?'); return; }
    if (!prompt.trim() && mode === 'generate') { setError('Enter a prompt first.'); return; }
    if (mode === 'transform' && !sourceFile)   { setError('Upload a source image first.'); return; }

    setGenerating(true);
    setResultImage(null);

    try {
      let uploadedImageName: string | undefined;

      if (mode === 'transform' && sourceFile) {
        setStatusMsg('Uploading source image to ComfyUI...');
        const base64 = await readFileAsB64(sourceFile);
        const up = await bridge.invoke('textures:comfyui-upload-image', {
          base64,
          filename: sourceFile.name,
          mimeType: sourceFile.type || 'image/png',
        });
        if (!up.success) { setError(up.error || 'Image upload failed.'); setGenerating(false); return; }
        uploadedImageName = up.name;
      }

      const res = RESOLUTIONS[resIdx];
      setStatusMsg('Generating — SDXL takes 40-90 s on a single RTX 2070...');

      const autoPrompt =
        mode === 'transform' && !prompt.trim()
          ? 'hyperrealistic, 8k uhd, professional photography, highly detailed, cinematic lighting, sharp focus, RAW photo'
          : prompt.trim();

      const result = await bridge.invoke('textures:comfyui-generate', {
        model: selectedModel,
        prompt: autoPrompt,
        negativePrompt: negPrompt,
        width: res.w,
        height: res.h,
        steps,
        cfg,
        seed: Math.floor(Math.random() * 2147483647),
        uploadedImageName,
        denoise: mode === 'transform' ? denoise : 1.0,
      });

      if (result.success) {
        setResultImage(result.imageData);
        setStatusMsg('');
      } else {
        setError(result.error || 'Generation failed.');
      }
    } catch (err: any) {
      setError(err.message || 'Unexpected error.');
    } finally {
      setGenerating(false);
    }
  };

  const downloadResult = () => {
    if (!resultImage) return;
    const a = document.createElement('a');
    a.href = resultImage;
    a.download = 'mossy_studio_' + Date.now() + '.png';
    a.click();
  };

  const copyResult = async () => {
    if (!resultImage) return;
    try {
      const res  = await fetch(resultImage);
      const blob = await res.blob();
      await navigator.clipboard.write([new ClipboardItem({ [blob.type]: blob })]);
    } catch {}
  };

  const fmtBytes = (n: number) =>
    n > 1e9 ? (n / 1e9).toFixed(1) + ' GB' : (n / 1e6).toFixed(0) + ' MB';

  const SC = { online: 'bg-emerald-400', checking: 'bg-amber-400 animate-pulse', offline: 'bg-red-400' };
  const ST = { online: 'text-emerald-400', checking: 'text-amber-400', offline: 'text-red-400' };
  const SL = { online: 'ComfyUI online', checking: 'Connecting...', offline: 'ComfyUI offline' };

  const MODES: { id: Mode; icon: React.ReactNode; label: string }[] = [
    { id: 'generate',  icon: <Wand2 className="w-3.5 h-3.5" />,    label: 'Generate'  },
    { id: 'transform', icon: <ImageIcon className="w-3.5 h-3.5" />, label: 'Transform' },
    { id: 'library',   icon: <Package className="w-3.5 h-3.5" />,   label: 'Models'    },
  ];

  return (
    <div className="flex gap-4 h-full min-h-0">

      {/* ── Controls ── */}
      <div className="w-72 flex-shrink-0 space-y-3 overflow-y-auto pr-1 pb-4">

        <div className="rounded-xl border border-violet-500/30 bg-gradient-to-br from-violet-900/30 to-black/40 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Camera className="w-4 h-4 text-violet-400" />
              <span className="font-bold text-white text-sm">AI Image Studio</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className={'w-2 h-2 rounded-full ' + SC[comfyStatus]} />
              <span className={'text-xs ' + ST[comfyStatus]}>{SL[comfyStatus]}</span>
              <button onClick={checkComfyUI} className="text-slate-500 hover:text-white transition-colors ml-0.5">
                <RefreshCw className="w-3 h-3" />
              </button>
            </div>
          </div>
          {comfyStatus === 'offline' && (
            <div className="mt-2 flex items-center gap-2 flex-wrap">
              <p className="text-xs text-red-300/80 leading-relaxed">
                ComfyUI not running at <span className="font-mono text-red-300">127.0.0.1:8188</span>
              </p>
              <button
                onClick={handleStartComfy}
                disabled={startingComfy}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-violet-600/20 border border-violet-500/40 text-xs text-violet-300 hover:bg-violet-600/30 transition-colors disabled:opacity-50"
              >
                {startingComfy
                  ? <><RotateCcw className="w-3 h-3 animate-spin" /> Starting…</>
                  : <><Zap className="w-3 h-3" /> Start ComfyUI</>}
              </button>
            </div>
          )}
        </div>

        <div className="flex gap-1 bg-slate-900/60 rounded-lg p-1 border border-slate-700">
          {MODES.map(m => (
            <button key={m.id} onClick={() => setMode(m.id)}
              className={'flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md text-xs font-semibold transition-all ' +
                (mode === m.id
                  ? 'bg-violet-500/20 text-violet-300 border border-violet-500/40'
                  : 'text-slate-400 hover:text-white')}>
              {m.icon}{m.label}
            </button>
          ))}
        </div>

        {mode !== 'library' && (
          <div>
            <label className="block text-xs text-slate-400 mb-1">Model</label>
            <select value={selectedModel} onChange={e => setSelectedModel(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-violet-500">
              {models.length === 0
                ? <option value="">No models — use Models tab to download</option>
                : models.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
        )}

        {mode === 'transform' && (
          <div>
            <label className="block text-xs text-slate-400 mb-1">Source Image</label>
            <div
              onDrop={handleDrop} onDragOver={e => e.preventDefault()}
              onClick={() => fileInputRef.current?.click()}
              className={'relative rounded-xl border-2 border-dashed cursor-pointer transition-colors overflow-hidden ' +
                (sourceImage ? 'border-violet-500/40' : 'border-slate-700 hover:border-violet-500/40 bg-slate-900/40')}
              style={{ minHeight: sourceImage ? undefined : 88 }}>
              {sourceImage
                ? <img src={sourceImage} alt="Source" className="w-full rounded-xl object-contain max-h-48" />
                : <div className="flex flex-col items-center justify-center gap-1 py-6">
                    <Upload className="w-6 h-6 text-slate-500" />
                    <p className="text-xs text-slate-500">Drop or click to browse</p>
                    <p className="text-[10px] text-slate-600">PNG  JPG  WEBP</p>
                  </div>}
            </div>
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileInput} />
            {sourceImage && (
              <button onClick={() => { setSourceImage(null); setSourceFile(null); }}
                className="mt-1 text-xs text-slate-500 hover:text-red-400 transition-colors">
                Clear image
              </button>
            )}
          </div>
        )}

        {mode === 'generate' && (
          <>
            <div>
              <label className="block text-xs text-slate-400 mb-1.5">Style Presets</label>
              <div className="flex flex-wrap gap-1">
                {STYLE_PRESETS.map(p => (
                  <button key={p.label} onClick={() => applyPreset(p.tokens)}
                    className="px-2 py-1 rounded-md bg-slate-800 border border-slate-700 text-xs text-slate-300 hover:bg-violet-500/10 hover:border-violet-500/40 hover:text-violet-300 transition-all">
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Prompt</label>
              <textarea value={prompt} onChange={e => setPrompt(e.target.value)} rows={3}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white resize-none focus:outline-none focus:border-violet-500 placeholder-slate-600"
                placeholder="Describe the image to generate..." />
            </div>
            <div>
              <button onClick={() => setShowNeg(!showNeg)}
                className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-300 transition-colors mb-1">
                {showNeg ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                Negative Prompt
              </button>
              {showNeg && (
                <textarea value={negPrompt} onChange={e => setNegPrompt(e.target.value)} rows={3}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-300 resize-none focus:outline-none focus:border-slate-500" />
              )}
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1.5">Resolution</label>
              <div className="flex flex-wrap gap-1">
                {RESOLUTIONS.map((r, i) => (
                  <button key={r.label} onClick={() => setResIdx(i)}
                    className={'px-2 py-1 rounded-md text-[10px] font-mono transition-all border ' +
                      (resIdx === i
                        ? 'bg-violet-500/20 border-violet-500/40 text-violet-300'
                        : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white hover:border-slate-600')}>
                    {r.label} <span className="opacity-60">{r.hint}</span>
                  </button>
                ))}
              </div>
            </div>
          </>
        )}

        {mode === 'transform' && (
          <>
            <div>
              <label className="block text-xs text-slate-400 mb-1">
                Prompt <span className="text-slate-600">(optional)</span>
              </label>
              <textarea value={prompt} onChange={e => setPrompt(e.target.value)} rows={3}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white resize-none focus:outline-none focus:border-violet-500 placeholder-slate-600"
                placeholder="Leave blank for auto photorealism..." />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs text-slate-400">Transformation Strength</label>
                <span className="text-xs font-mono text-violet-300">{denoise.toFixed(2)}</span>
              </div>
              <input type="range" min="0.3" max="0.9" step="0.05"
                value={denoise} onChange={e => setDenoise(parseFloat(e.target.value))}
                className="w-full accent-violet-500" />
              <div className="flex justify-between text-[10px] text-slate-600 mt-0.5">
                <span>Subtle</span><span>Balanced</span><span>Heavy</span>
              </div>
            </div>
          </>
        )}

        {mode !== 'library' && (
          <>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs text-slate-400">Steps</label>
                  <span className="text-xs font-mono text-slate-300">{steps}</span>
                </div>
                <input type="range" min="10" max="60" step="5"
                  value={steps} onChange={e => setSteps(parseInt(e.target.value))}
                  className="w-full accent-violet-500" />
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs text-slate-400">CFG</label>
                  <span className="text-xs font-mono text-slate-300">{cfg}</span>
                </div>
                <input type="range" min="1" max="15" step="0.5"
                  value={cfg} onChange={e => setCfg(parseFloat(e.target.value))}
                  className="w-full accent-violet-500" />
              </div>
            </div>

            <button onClick={handleGenerate}
              disabled={generating || comfyStatus !== 'online' || !selectedModel}
              className="w-full py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white shadow-lg shadow-violet-900/30">
              {generating
                ? <><Loader2 className="w-4 h-4 animate-spin" />{mode === 'transform' ? 'Transforming...' : 'Generating...'}</>
                : <><Zap className="w-4 h-4" />{mode === 'transform' ? 'Transform to Photorealistic' : 'Generate Image'}</>}
            </button>

            {error && (
              <div className="rounded-lg border border-red-500/30 bg-red-900/20 px-3 py-2 flex gap-2 text-xs text-red-300">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" /><span>{error}</span>
              </div>
            )}
          </>
        )}
      </div>

      {/* ── Main content ── */}
      {mode === 'library' ? (
        <div className="flex-1 min-w-0 overflow-y-auto pb-4">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-white font-bold text-base">Recommended Photorealism Models</h3>
                <p className="text-xs text-slate-400 mt-0.5">Both are free — open license, personal and commercial use allowed.</p>
              </div>
              <button onClick={refreshInstalled}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-xs text-slate-300 hover:text-white transition-colors">
                <RefreshCw className="w-3.5 h-3.5" /> Refresh
              </button>
            </div>

            {RECOMMENDED_MODELS.map(model => {
              const isInstalled = installedFiles.includes(model.filename);
              const dlState     = dlStates[model.id] ?? 'idle';
              const prog        = dlProgress[model.filename];
              const dlErr       = dlErrors[model.id];
              const elapsed     = restartElapsed[model.id] ?? 0;

              return (
                <div key={model.id} className="rounded-xl border border-slate-700 bg-slate-900/50 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="font-bold text-white text-sm">{model.name}</span>
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-violet-500/20 text-violet-300 border border-violet-500/30">
                          {model.tag}
                        </span>
                        {isInstalled && dlState === 'done' && (
                          <span className="flex items-center gap-1 text-[10px] text-emerald-400">
                            <CheckCircle2 className="w-3 h-3" /> Installed &amp; loaded
                          </span>
                        )}
                        {isInstalled && dlState !== 'done' && (
                          <span className="flex items-center gap-1 text-[10px] text-emerald-400">
                            <CheckCircle2 className="w-3 h-3" /> Installed
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-400 mb-1.5">{model.description}</p>
                      <div className="flex items-center gap-3 text-[10px] text-slate-500">
                        <span className="text-emerald-500/80">{model.license}</span>
                        <span>~{(model.sizeMB / 1024).toFixed(1)} GB</span>
                        <span>HuggingFace</span>
                      </div>
                    </div>

                    <div className="flex-shrink-0">
                      {dlState === 'done' && isInstalled ? (
                        <div className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-900/20 border border-emerald-500/30 text-xs text-emerald-400">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Ready
                        </div>
                      ) : dlState === 'downloading' ? (
                        <div className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-violet-900/20 border border-violet-500/30 text-xs text-violet-300">
                          <Loader2 className="w-3.5 h-3.5 animate-spin" /> Downloading...
                        </div>
                      ) : dlState === 'restarting' ? (
                        <div className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-amber-900/20 border border-amber-500/30 text-xs text-amber-300">
                          <RotateCcw className="w-3.5 h-3.5 animate-spin" /> Restarting...
                        </div>
                      ) : isInstalled ? (
                        <div className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-900/20 border border-emerald-500/30 text-xs text-emerald-400">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Installed
                        </div>
                      ) : (
                        <button onClick={() => downloadModel(model)}
                          className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 text-xs text-white font-semibold transition-colors">
                          <Download className="w-3.5 h-3.5" /> Download Free
                        </button>
                      )}
                    </div>
                  </div>

                  {dlState === 'downloading' && (
                    <div className="mt-3">
                      {prog && prog.total > 0 ? (
                        <>
                          <div className="flex justify-between text-[10px] text-slate-500 mb-1">
                            <span>{prog.percent}% — downloading</span>
                            <span>{fmtBytes(prog.received)} / {fmtBytes(prog.total)}</span>
                          </div>
                          <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                            <div className="h-full bg-gradient-to-r from-violet-500 to-fuchsia-500 rounded-full transition-all duration-300"
                              style={{ width: prog.percent + '%' }} />
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="text-[10px] text-slate-500 mb-1">Connecting to HuggingFace...</div>
                          <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                            <div className="h-full bg-violet-500/50 rounded-full animate-pulse w-full" />
                          </div>
                        </>
                      )}
                    </div>
                  )}

                  {dlState === 'restarting' && (
                    <div className="mt-3">
                      <div className="flex justify-between text-[10px] text-slate-500 mb-1">
                        <span className="flex items-center gap-1">
                          <RotateCcw className="w-3 h-3 animate-spin" />
                          Restarting ComfyUI — loading new model...
                        </span>
                        <span>{elapsed}s</span>
                      </div>
                      <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-amber-500 to-orange-500 rounded-full animate-pulse"
                          style={{ width: Math.min(100, (elapsed / 60) * 100) + '%' }} />
                      </div>
                      <p className="text-[10px] text-slate-600 mt-1">Usually takes 20-40 seconds on first load</p>
                    </div>
                  )}

                  {dlState === 'done' && isInstalled && (
                    <div className="mt-2 flex items-center gap-1.5 text-[10px] text-emerald-400">
                      <CheckCircle2 className="w-3 h-3" />
                      Model downloaded, ComfyUI restarted — select it in Generate or Transform
                    </div>
                  )}

                  {dlErr && (dlState === 'error' || dlState === 'done') && (
                    <div className={`mt-2 flex items-center gap-1.5 text-[10px] ${dlState === 'error' ? 'text-red-400' : 'text-amber-400'}`}>
                      {dlState === 'error'
                        ? <XCircle className="w-3.5 h-3.5 flex-shrink-0" />
                        : <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />}
                      <span>{dlErr}</span>
                    </div>
                  )}
                </div>
              );
            })}

            <div className="rounded-xl border border-slate-800 bg-slate-900/30 p-4">
              <div className="flex items-center gap-2 mb-2">
                <BookOpen className="w-4 h-4 text-slate-500" />
                <span className="text-xs text-slate-400 font-semibold">What happens when you click Download</span>
              </div>
              <ol className="space-y-1 text-xs text-slate-500 list-decimal list-inside">
                <li>Model downloads from HuggingFace (~6.7 GB, progress shown)</li>
                <li>ComfyUI is automatically restarted so the model loads</li>
                <li>Connection is verified — status turns green</li>
                <li>Switch to Generate or Transform and pick the new model</li>
              </ol>
            </div>

            {installedFiles.length > 0 && (
              <div className="rounded-xl border border-slate-800 bg-slate-900/30 p-4">
                <p className="text-xs text-slate-400 font-semibold mb-2">Installed checkpoints</p>
                <div className="space-y-1">
                  {installedFiles.map(f => (
                    <div key={f} className="flex items-center gap-2 text-xs text-slate-300">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                      <span className="font-mono truncate">{f}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* ── Output canvas ── */
        <div className="flex-1 min-w-0 flex flex-col gap-2">
          <div className="flex-1 rounded-xl border border-slate-700 bg-slate-900/40 flex flex-col items-center justify-center overflow-hidden relative min-h-0">
            {resultImage ? (
              <>
                <img src={resultImage} alt="Generated" className="max-w-full max-h-full object-contain rounded-xl p-2" />
                <div className="absolute bottom-3 right-3 flex gap-2">
                  <button onClick={copyResult}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900/90 border border-slate-600 text-xs text-white hover:bg-slate-800 transition-colors">
                    <Copy className="w-3.5 h-3.5" /> Copy
                  </button>
                  <button onClick={downloadResult}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-violet-700/80 border border-violet-500/40 text-xs text-white hover:bg-violet-600 transition-colors">
                    <Download className="w-3.5 h-3.5" /> Download PNG
                  </button>
                </div>
              </>
            ) : (
              <div className="text-center p-8">
                {generating ? (
                  <div className="space-y-3">
                    <Loader2 className="w-10 h-10 text-violet-400 animate-spin mx-auto" />
                    <p className="text-sm text-slate-300">{statusMsg}</p>
                    <p className="text-xs text-slate-600">SDXL on a single RTX 2070 takes 40-90 seconds</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <ImageIcon className="w-14 h-14 text-slate-700 mx-auto" />
                    <p className="text-slate-500 text-sm">Output image appears here</p>
                    <p className="text-slate-700 text-xs">
                      {mode === 'generate'
                        ? 'Pick a style preset or write a prompt, then click Generate'
                        : 'Upload a source image and click Transform to Photorealistic'}
                    </p>
                    {models.length === 0 && (
                      <button onClick={() => setMode('library')}
                        className="mt-3 flex items-center gap-1.5 mx-auto px-3 py-1.5 rounded-lg bg-violet-600/20 border border-violet-500/30 text-xs text-violet-300 hover:bg-violet-600/30 transition-colors">
                        <Package className="w-3.5 h-3.5" /> No models — download free models
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
          {comfyStatus === 'online' && models.length > 0 && !generating && !resultImage && (
            <div className="rounded-lg border border-slate-800 bg-slate-900/40 px-3 py-2 text-xs text-slate-500">
              Best photorealism: <span className="text-slate-300">JuggernautXL</span>, <span className="text-slate-300">RealVisXL</span> — Steps 30+, CFG 6-8.{' '}
              <button onClick={() => setMode('library')} className="text-violet-400 hover:text-violet-300 underline">
                Get free models
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AIImageStudio;
