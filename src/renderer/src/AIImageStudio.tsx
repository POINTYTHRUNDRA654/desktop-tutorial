import React, { useState, useEffect, useRef } from 'react';
import {
  Wand2, Upload, Download, RefreshCw, ImageIcon, Zap,
  AlertCircle, Loader2, ChevronDown, ChevronUp, Camera, Copy,
  Package, CheckCircle2, XCircle, BookOpen, RotateCcw, Paintbrush,
  LayoutGrid, Sparkles, FolderOpen, ShieldCheck, ShieldAlert, Search,
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

// Z-Image-Turbo (Tongyi-MAI) and FLUX.2 [klein] 4B (Black Forest Labs): both Apache-2.0, free for any use.
// NOT the 9B klein (non-commercial). Official ComfyUI repackaged files; both share the qwen_3_4b text encoder.
// Handlers: src/electron/comfyModernImaging.ts (textures:modern-status / modern-generate / klein-edit / make-seamless).
const MODERN_FILES = [
  { id: 'zimage-unet', name: 'Z-Image-Turbo (int8)', filename: 'z_image_turbo_int8_convrot.safetensors', subfolder: 'diffusion_models', sizeMB: 5920,
    url: 'https://huggingface.co/Comfy-Org/z_image_turbo/resolve/main/split_files/diffusion_models/z_image_turbo_int8_convrot.safetensors', usedBy: 'Z-Image' },
  { id: 'klein-unet', name: 'FLUX.2 klein 4B', filename: 'flux-2-klein-4b.safetensors', subfolder: 'diffusion_models', sizeMB: 7390,
    url: 'https://huggingface.co/Comfy-Org/flux2-klein-4B/resolve/main/split_files/diffusion_models/flux-2-klein-4b.safetensors', usedBy: 'klein' },
  { id: 'qwen3-4b', name: 'Qwen3 4B text encoder', filename: 'qwen_3_4b.safetensors', subfolder: 'text_encoders', sizeMB: 7670,
    url: 'https://huggingface.co/Comfy-Org/z_image_turbo/resolve/main/split_files/text_encoders/qwen_3_4b.safetensors', usedBy: 'Z-Image + klein' },
  { id: 'zimage-vae', name: 'Z-Image VAE', filename: 'ae.safetensors', subfolder: 'vae', sizeMB: 320,
    url: 'https://huggingface.co/Comfy-Org/z_image_turbo/resolve/main/split_files/vae/ae.safetensors', usedBy: 'Z-Image' },
  { id: 'flux2-vae', name: 'FLUX.2 VAE', filename: 'flux2-vae.safetensors', subfolder: 'vae', sizeMB: 320,
    url: 'https://huggingface.co/Comfy-Org/flux2-klein-4B/resolve/main/split_files/vae/flux2-vae.safetensors', usedBy: 'klein' },
];

type Engine = 'sdxl' | 'zimage' | 'klein';
interface FamilyStatus { ready: boolean; missingFiles: string[]; missingNodes: string[] }
interface ModernStatus { online: boolean; comfyVersion?: string | null; zimage?: FamilyStatus; klein?: FamilyStatus }
interface SeamStats { wrapLR: number; wrapTB: number; crossV: number; crossH: number }
type LicenceClass = 'cc0' | 'vanilla' | 'own' | 'check' | 'game' | 'unknown';
interface LibRoot { path: string; own: boolean; game?: boolean }
type RootKind = 'library' | 'own' | 'game';
const rootKind = (r: LibRoot): RootKind => (r.game ? 'game' : r.own ? 'own' : 'library');
const kindToRoot = (path: string, k: RootKind): LibRoot => ({ path, own: k === 'own', game: k === 'game' });
interface LibItem { path: string; name: string; set: string; category: string; licence: LicenceClass; evidence: string; bytes: number }
interface LibStatus { scanned: boolean; roots?: LibRoot[]; texconv?: boolean; scannedAt?: string; sets?: number; counts?: Record<LicenceClass, number>; images?: Record<LicenceClass, number>; categories?: string[] }
const LICENCE_LABEL: Record<LicenceClass, string> = { cc0: 'Safe to ship (CC0)', vanilla: 'Fallout 4 game files', own: 'My own work', check: 'Check licence', game: 'Game files', unknown: 'Unknown source' };
const OWN_NOTE = 'Your own work: you decide. Anything in it copied from the game or another mod still cannot be redistributed.';
const VANILLA_NOTE = 'Fallout 4 game texture: Fallout 4 retexture mods normally ship edited game textures. Never use it outside a Fallout 4 mod.';
const KIND_LABEL: Record<RootKind, string> = { library: 'Library', own: 'My own work', game: 'Fallout 4 game files' };
const LIB_PAGE = 48;

const DEFAULT_NEGATIVE =
  'blurry, low quality, watermark, text, signature, deformed, ugly, bad anatomy, ' +
  'disfigured, mutation, extra limbs, poorly drawn, jpeg artifacts, noise, grainy, ' +
  'out of focus, overexposed, underexposed';

type Mode = 'generate' | 'transform' | 'inpaint' | 'seamless' | 'edit' | 'library';
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
  // LayerDiffuse (huchenlei/ComfyUI-layerdiffuse, Apache-2.0) — native-alpha generation.
  // Only applies in generate mode (txt2img); ignored for transform/img2img.
  const [transparent, setTransparent] = useState(false);

  const [sourceImage, setSourceImage] = useState<string | null>(null);
  const [sourceFile, setSourceFile]   = useState<File | null>(null);

  // Inpaint mode (lquesada/ComfyUI-Inpaint-CropAndStitch, GPL-3.0 wrapper) — brush-only
  // mask canvas, sized to the source image's natural resolution so the exported mask
  // stays pixel-accurate regardless of on-screen zoom.
  const maskCanvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const drawingRef = useRef(false);
  const [brushSize, setBrushSize] = useState(40);
  const [hasMask, setHasMask] = useState(false);

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

  // Modern engines (Z-Image / FLUX.2 klein). 'sdxl' keeps the original checkpoint path untouched.
  const [engine, setEngine] = useState<Engine>('sdxl');
  const [modern, setModern] = useState<ModernStatus>({ online: false });
  const [seamStats, setSeamStats] = useState<{ before: SeamStats; after: SeamStats; grain: string; seconds: number } | null>(null);
  const [showTiled, setShowTiled] = useState(true);

  // Texture library (the user's own photo textures; see src/electron/textureLibrary.ts)
  const [libOpen, setLibOpen] = useState(false);
  const [lib, setLib] = useState<LibStatus>({ scanned: false });
  const [libRootInput, setLibRootInput] = useState('');
  const [libRoots, setLibRoots] = useState<LibRoot[]>([]);
  const [libRootKind, setLibRootKind] = useState<RootKind>('library');
  const [libScanning, setLibScanning] = useState(false);
  const [libLicences, setLibLicences] = useState<LicenceClass[]>(['cc0', 'vanilla', 'own']);
  const [libCategory, setLibCategory] = useState('');
  const [libQuery, setLibQuery] = useState('');
  const [libItems, setLibItems] = useState<LibItem[]>([]);
  const [libTotal, setLibTotal] = useState(0);
  const [libOffset, setLibOffset] = useState(0);
  const [libThumbs, setLibThumbs] = useState<Record<string, string>>({});
  const [libMsg, setLibMsg] = useState('');
  const [libPath, setLibPath] = useState<string | null>(null);              // full-res source read by the main process
  const [sourceLicence, setSourceLicence] = useState<{ licence: LicenceClass; evidence: string } | null>(null);
  const [keepDetail, setKeepDetail] = useState(true);
  const [outSize, setOutSize] = useState(2048);

  // Quick ComfyUI path configuration — previously the only way to set this was a
  // completely different platform (External Integrations Hub), with no hint here that
  // "ComfyUI not running" might just mean this was never configured at all.
  const [showComfyPathEditor, setShowComfyPathEditor] = useState(false);
  const [comfyPathInput, setComfyPathInput] = useState('');
  const [savingComfyPath, setSavingComfyPath] = useState(false);

  // LayerDiffuse (huchenlei/ComfyUI-layerdiffuse, Apache-2.0) availability + install,
  // reusing the same generic install channels PostProcessingPipeline.tsx uses.
  const [layerDiffuseAvailable, setLayerDiffuseAvailable] = useState<boolean | null>(null);
  const [layerDiffuseInstalling, setLayerDiffuseInstalling] = useState(false);

  const checkLayerDiffuse = () => {
    bridge?.invoke?.('post-process:comfyui-check-tool', 'LayeredDiffusionApply').then((r: any) => {
      setLayerDiffuseAvailable(!!r?.available);
    });
  };

  const installLayerDiffuse = async () => {
    setLayerDiffuseInstalling(true);
    try {
      const r = await bridge?.invoke?.('post-process:comfyui-install-node', {
        owner: 'huchenlei', repo: 'ComfyUI-layerdiffuse', checkClassType: 'LayeredDiffusionApply',
      });
      if (r?.success) checkLayerDiffuse();
    } finally {
      setLayerDiffuseInstalling(false);
    }
  };

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { void checkComfyUI(); }, []);
  useEffect(() => { if (transparent && layerDiffuseAvailable === null) checkLayerDiffuse(); }, [transparent]);

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
        const liveModels: string[] = (mr.success && mr.models?.length > 0) ? mr.models : [];
        setModels(liveModels);
        setSelectedModel(prev => liveModels.includes(prev) ? prev : (liveModels[0] || ''));
        void refreshModern();
        // ComfyUI's own /object_info list reflects what its running process actually has
        // indexed — it can lag behind reality (just restarted and still scanning, or its
        // configured models path doesn't match what we scan on disk). Always refresh the
        // disk-scanned list too so the UI can tell "genuinely nothing installed" apart from
        // "ComfyUI hasn't picked it up yet" instead of just showing "No models" either way.
        await refreshInstalled();
      } else {
        setComfyStatus('offline');
        setModels([]);
      }
    } catch {
      setComfyStatus('offline');
      setModels([]);
    }
  };

  const handleStartComfy = async () => {
    setStartingComfy(true);
    setError('');
    try {
      const restart = await bridge.invoke('textures:comfyui-restart');
      if (!restart?.success) {
        // Previously swallowed silently — the user just saw "offline" again with zero
        // explanation of why the restart attempt itself failed (e.g. a misconfigured
        // ComfyUI path, per comfyuiRestartAndWait's fast-fail checks).
        setError(restart?.error || 'Failed to start ComfyUI.');
      }
      await checkComfyUI();
    } catch (err: any) {
      setError(err?.message || 'Failed to start ComfyUI.');
    } finally {
      setStartingComfy(false);
    }
  };

  const browseComfyPath = async () => {
    const picked = await bridge?.pickDirectory?.('Select your ComfyUI install folder (the portable release folder with run_nvidia_gpu.bat, or the ComfyUI Desktop app\'s install folder with ComfyUI.exe)').catch(() => null);
    if (picked) setComfyPathInput(picked);
  };

  const saveComfyPath = async () => {
    const trimmed = comfyPathInput.trim();
    setSavingComfyPath(true);
    try {
      await bridge?.setSettings?.({ comfyuiPath: trimmed }).catch(() => null);
      setShowComfyPathEditor(false);
      await handleStartComfy();
    } finally {
      setSavingComfyPath(false);
    }
  };

  const refreshInstalled = async () => {
    try {
      const r = await bridge.invoke('textures:comfyui-list-checkpoints');
      if (r.success) setInstalledFiles((r.files as any[]).map((f: any) => f.name));
    } catch { /* noop */ }
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

  const refreshModern = async () => {
    try { setModern(await bridge.invoke('textures:modern-status')); } catch { setModern({ online: false }); }
  };

  // Same download handler as the SDXL models, into the folder each file belongs in. No ComfyUI restart:
  // ComfyUI re-reads its model folders when asked for the lists, and a Comfy Desktop instance can't be
  // restarted from here anyway.
  const downloadModernFile = async (f: typeof MODERN_FILES[0]) => {
    setDlStates(prev => ({ ...prev, [f.id]: 'downloading' }));
    setDlErrors(prev => { const n = { ...prev }; delete n[f.id]; return n; });
    setDlProgress(prev => ({ ...prev, [f.filename]: { percent: 0, received: 0, total: 0 } }));
    try {
      const r = await bridge.invoke('textures:comfyui-download-model', { url: f.url, filename: f.filename, subfolder: f.subfolder });
      if (!r?.success) {
        setDlStates(prev => ({ ...prev, [f.id]: 'error' }));
        setDlErrors(prev => ({ ...prev, [f.id]: r?.error || 'Download failed' }));
        return;
      }
      setDlStates(prev => ({ ...prev, [f.id]: 'done' }));
      await refreshModern();
    } catch (e: any) {
      setDlStates(prev => ({ ...prev, [f.id]: 'error' }));
      setDlErrors(prev => ({ ...prev, [f.id]: e.message }));
    }
  };

  const modernFileMissing = (filename: string) =>
    !modern.online || [...(modern.zimage?.missingFiles ?? []), ...(modern.klein?.missingFiles ?? [])].some(p => p.endsWith('/' + filename));

  // Which modern model family the current mode/engine needs (null = the SDXL checkpoint path).
  const modernFamily: 'zimage' | 'klein' | null =
    mode === 'seamless' ? 'zimage' : mode === 'edit' ? 'klein' : mode === 'generate' && engine !== 'sdxl' ? engine : null;
  const modernFamilyStatus = modernFamily ? modern[modernFamily] : undefined;
  const modernNotReadyReason = !modernFamily ? '' : !modern.online ? 'ComfyUI is not running.'
    : !modernFamilyStatus ? 'Checking models...'
    : modernFamilyStatus.missingNodes.length ? `Your ComfyUI is too old for ${modernFamily === 'zimage' ? 'Z-Image' : 'FLUX.2 klein'} (missing ${modernFamilyStatus.missingNodes.join(', ')}). Update ComfyUI.`
    : modernFamilyStatus.missingFiles.length ? `Missing model files: ${modernFamilyStatus.missingFiles.join(', ')}. Get them in the Models tab.`
    : '';

  // Decoded by hand: fetch() on a data: URL is blocked in the packaged app (found live 2026-11-19 -- the
  // hand-off silently did nothing).
  const dataUrlToFile = (dataUrl: string, name: string): File => {
    const [head, b64] = dataUrl.split(',');
    const type = /data:([^;]+)/.exec(head)?.[1] || 'image/png';
    const bin = atob(b64);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return new File([bytes], name, { type });
  };

  const handleModern = async () => {
    if (modernNotReadyReason) { setError(modernNotReadyReason); return; }
    if (mode === 'generate' && !prompt.trim()) { setError('Enter a prompt first.'); return; }
    if ((mode === 'seamless' || mode === 'edit') && !sourceFile && !libPath) { setError('Upload a texture or pick one from your library first.'); return; }
    if (mode === 'seamless' && !prompt.trim()) { setError('Describe the surface first (for example "rusted green corrugated metal").'); return; }
    if (mode === 'edit' && !prompt.trim()) { setError('Describe what to change first.'); return; }
    setGenerating(true);
    setResultImage(null);
    setSeamStats(null);
    try {
      if (mode === 'generate') {
        const res = RESOLUTIONS[resIdx];
        setStatusMsg(engine === 'zimage' ? 'Generating with Z-Image-Turbo (about 30 s on an RTX 2070)...' : 'Generating with FLUX.2 klein (about 15 s on an RTX 2070)...');
        const r = await bridge.invoke('textures:modern-generate', { family: engine, prompt: prompt.trim(), width: res.w, height: res.h });
        if (r.success) setResultImage(r.imageData); else setError(r.error || 'Generation failed.');
      } else if (mode === 'edit') {
        setStatusMsg(keepDetail ? 'Editing with FLUX.2 klein, then putting the photo\'s real detail back at full size (about 30 s)...' : 'Editing with FLUX.2 klein (about 20 s at 1024 px)...');
        const src = libPath ? { sourcePath: libPath } : { imageBase64: await readFileAsB64(sourceFile!) };
        const r = await bridge.invoke('textures:klein-edit', { ...src, instruction: prompt.trim(), keepDetail, outSize });
        if (r.success) setResultImage(r.imageData); else setError(r.error || 'Edit failed.');
      } else {
        setStatusMsg('Making it seamless: Z-Image repaints the seams (about 30 s at 1024 px, several minutes at 2048 px)...');
        const src = libPath ? { sourcePath: libPath } : { imageBase64: await readFileAsB64(sourceFile!) };
        const r = await bridge.invoke('textures:make-seamless', { ...src, prompt: prompt.trim() });
        if (r.success) { setResultImage(r.imageData); setSeamStats({ before: r.before, after: r.after, grain: r.grain, seconds: r.seconds }); }
        else setError(r.error || 'Make Seamless failed.');
      }
      setStatusMsg('');
    } catch (err: any) {
      setError(err?.message || 'Unexpected error.');
    } finally {
      setGenerating(false);
    }
  };

  // Edit result -> Make Seamless (an edit loosens the tiling a little; this puts it back).
  const sendResultToSeamless = () => {
    if (!resultImage) return;
    try {
      const file = dataUrlToFile(resultImage, 'mossy_edited.png');
      setSourceFile(file);
      setSourceImage(resultImage);
      setLibPath(null);           // the edited image is the new source; sourceLicence stays (same origin)
      setResultImage(null);
      setSeamStats(null);
      setError('');
      setMode('seamless');
    } catch (err: any) {
      setError(`Could not hand the edited texture to Make Seamless: ${err?.message || err}. Download it and upload it in the Seamless tab instead.`);
    }
  };

  const refreshLib = async () => {
    try {
      const s: LibStatus = await bridge.invoke('textures:library-status');
      setLib(s);
      if (s.roots?.length) setLibRoots(prev => (prev.length ? prev : s.roots!));
    } catch { setLib({ scanned: false }); }
  };

  const loadLibPage = async (offset = 0) => {
    const r = await bridge.invoke('textures:library-list', { licences: libLicences, category: libCategory || undefined, query: libQuery, offset, limit: LIB_PAGE });
    if (!r?.success) { setLibItems([]); setLibTotal(0); setLibMsg(r?.error || ''); return; }
    setLibItems(r.items); setLibTotal(r.total); setLibOffset(offset); setLibMsg('');
    for (const it of r.items as LibItem[]) {
      if (libThumbs[it.path]) continue;
      bridge.invoke('textures:library-thumb', { path: it.path }).then((t: any) => {
        if (t?.success) setLibThumbs(prev => ({ ...prev, [it.path]: t.dataUrl }));
      });
    }
  };

  const addLibRoot = () => {
    const p = libRootInput.trim();
    if (!p) { setLibMsg('Enter or browse to a texture folder first.'); return; }
    setLibRoots(prev => prev.some(r => r.path.toLowerCase() === p.toLowerCase()) ? prev : [...prev, kindToRoot(p, libRootKind)]);
    setLibRootInput(''); setLibRootKind('library'); setLibMsg('Folder added. Click Scan to read it.');
  };

  const scanLibrary = async () => {
    if (!libRoots.length) { setLibMsg('Add at least one texture folder first.'); return; }
    setLibScanning(true); setLibMsg('Scanning... (about 10-20 s for 100,000 files; nothing in the folders is changed)');
    try {
      const r = await bridge.invoke('textures:library-scan', { roots: libRoots });
      if (!r?.success) { setLibMsg(r?.error || 'Scan failed.'); return; }
      setLibMsg(`Scanned ${r.files.toLocaleString()} files in ${r.sets.toLocaleString()} folders: ${r.counts.cc0} safe to ship (CC0), ${r.counts.vanilla} Fallout 4 game files, ${r.counts.own} your own work, ${r.counts.check} check licence, ${r.counts.game} game files, ${r.counts.unknown} unknown source.`);
      await refreshLib();
      await loadLibPage(0);
    } finally { setLibScanning(false); }
  };

  const browseLibRoot = async () => {
    const picked = await bridge?.pickDirectory?.('Select your texture library folder').catch(() => null);
    if (picked) setLibRootInput(picked);
  };

  const exportNotShippable = async () => {
    const r = await bridge.invoke('textures:library-export-not-shippable');
    setLibMsg(r?.success ? `Saved the list of ${r.sets} folders that are not safe to ship: ${r.path}` : (r?.error || 'Could not save the list.'));
  };

  const pickFromLibrary = async (it: LibItem) => {
    setLibMsg('Loading...');
    const r = await bridge.invoke('textures:library-preview', { path: it.path });
    if (!r?.success) { setLibMsg(r?.error || 'Could not open that texture.'); return; }
    setSourceImage(r.dataUrl); setSourceFile(null); setLibPath(it.path);
    setSourceLicence({ licence: it.licence, evidence: it.evidence });
    setResultImage(null); setSeamStats(null); setLibOpen(false); setLibMsg('');
  };

  useEffect(() => { if (libOpen) { void refreshLib(); } }, [libOpen]);
  useEffect(() => { if (libOpen && lib.scanned) void loadLibPage(0); }, [libOpen, lib.scanned, libLicences, libCategory]);

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
    setLibPath(null); setSourceLicence(null);
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

  const setupMaskCanvas = () => {
    const canvas = maskCanvasRef.current;
    const img = imgRef.current;
    if (!canvas || !img || !img.naturalWidth) return;
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    const ctx = canvas.getContext('2d');
    if (ctx) { ctx.fillStyle = 'black'; ctx.fillRect(0, 0, canvas.width, canvas.height); }
    setHasMask(false);
  };

  const maskPointFromEvent = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = maskCanvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) * (canvas.width / rect.width),
      y: (e.clientY - rect.top) * (canvas.height / rect.height),
    };
  };

  const paintMaskAt = (x: number, y: number) => {
    const ctx = maskCanvasRef.current?.getContext('2d');
    if (!ctx) return;
    ctx.fillStyle = 'white';
    ctx.beginPath();
    ctx.arc(x, y, brushSize, 0, Math.PI * 2);
    ctx.fill();
    setHasMask(true);
  };

  const handleMaskDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    drawingRef.current = true;
    const p = maskPointFromEvent(e);
    paintMaskAt(p.x, p.y);
  };
  const handleMaskMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!drawingRef.current) return;
    const p = maskPointFromEvent(e);
    paintMaskAt(p.x, p.y);
  };
  const handleMaskUp = () => { drawingRef.current = false; };

  const handleGenerate = async () => {
    setError('');
    if (modernFamily) { await handleModern(); return; }
    if (!selectedModel)                        { setError('No model selected. Is ComfyUI running?'); return; }
    if (!prompt.trim() && mode === 'generate') { setError('Enter a prompt first.'); return; }
    if (mode === 'transform' && !sourceFile)   { setError('Upload a source image first.'); return; }
    if (mode === 'inpaint' && !sourceFile)     { setError('Upload a source image first.'); return; }
    if (mode === 'inpaint' && !hasMask)        { setError('Paint a mask over the area to inpaint first.'); return; }

    setGenerating(true);
    setResultImage(null);

    if (mode === 'inpaint') {
      try {
        setStatusMsg('Uploading image + mask to ComfyUI...');
        const imgB64 = await readFileAsB64(sourceFile!);
        const upImg = await bridge.invoke('textures:comfyui-upload-image', {
          base64: imgB64, filename: sourceFile!.name, mimeType: sourceFile!.type || 'image/png',
        });
        if (!upImg.success) { setError(upImg.error || 'Image upload failed.'); setGenerating(false); return; }

        const maskDataUrl = maskCanvasRef.current!.toDataURL('image/png');
        const upMask = await bridge.invoke('textures:comfyui-upload-image', {
          base64: maskDataUrl.split(',')[1], filename: 'mossy_inpaint_mask.png', mimeType: 'image/png',
        });
        if (!upMask.success) { setError(upMask.error || 'Mask upload failed.'); setGenerating(false); return; }

        setStatusMsg('Inpainting — this can take a minute...');
        const result = await bridge.invoke('textures:comfyui-inpaint', {
          model: selectedModel,
          prompt: prompt.trim() || 'high quality, detailed, seamless',
          negativePrompt: negPrompt,
          uploadedImageName: upImg.name,
          uploadedMaskName: upMask.name,
          steps, cfg, denoise,
          seed: Math.floor(Math.random() * 2147483647),
        });
        if (result.success) { setResultImage(result.imageData); setStatusMsg(''); }
        else setError(result.error || 'Inpaint failed.');
      } catch (err: any) {
        setError(err.message || 'Unexpected error.');
      } finally {
        setGenerating(false);
      }
      return;
    }

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
        transparent: mode === 'generate' ? transparent : false,
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
    } catch { /* noop */ }
  };

  const fmtBytes = (n: number) =>
    n > 1e9 ? (n / 1e9).toFixed(1) + ' GB' : (n / 1e6).toFixed(0) + ' MB';

  const SC = { online: 'bg-emerald-400', checking: 'bg-amber-400 animate-pulse', offline: 'bg-red-400' };
  const ST = { online: 'text-emerald-400', checking: 'text-amber-400', offline: 'text-red-400' };
  const SL = { online: 'ComfyUI online', checking: 'Connecting...', offline: 'ComfyUI offline' };

  const MODES: { id: Mode; icon: React.ReactNode; label: string }[] = [
    { id: 'generate',  icon: <Wand2 className="w-3.5 h-3.5" />,    label: 'Generate'  },
    { id: 'transform', icon: <ImageIcon className="w-3.5 h-3.5" />, label: 'Transform' },
    { id: 'inpaint',   icon: <Paintbrush className="w-3.5 h-3.5" />, label: 'Inpaint'   },
    { id: 'seamless',  icon: <LayoutGrid className="w-3.5 h-3.5" />, label: 'Seamless'  },
    { id: 'edit',      icon: <Sparkles className="w-3.5 h-3.5" />,  label: 'Edit'      },
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
            <div className="mt-2 space-y-2">
              <div className="flex items-center gap-2 flex-wrap">
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
                <button
                  onClick={() => setShowComfyPathEditor(v => !v)}
                  className="text-xs text-slate-500 hover:text-slate-300 underline transition-colors"
                >
                  {showComfyPathEditor ? 'Cancel' : "Wrong folder? Set ComfyUI path"}
                </button>
              </div>
              {showComfyPathEditor && (
                <div className="flex items-center gap-2">
                  <input
                    type="text" value={comfyPathInput} onChange={e => setComfyPathInput(e.target.value)}
                    placeholder="e.g. D:\ComfyUI_windows_portable"
                    className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-2 py-1 text-xs text-white focus:outline-none focus:border-violet-500"
                  />
                  <button onClick={browseComfyPath} className="text-xs px-2 py-1 rounded bg-slate-700 hover:bg-slate-600 text-slate-300">
                    Browse…
                  </button>
                  <button
                    onClick={saveComfyPath}
                    disabled={savingComfyPath || !comfyPathInput.trim()}
                    className="text-xs px-2 py-1 rounded bg-violet-600 hover:bg-violet-700 disabled:bg-slate-600 text-white"
                  >
                    {savingComfyPath ? 'Saving…' : 'Save & Start'}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="grid grid-cols-3 gap-1 bg-slate-900/60 rounded-lg p-1 border border-slate-700">
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

        {mode === 'generate' && (
          <div>
            <label className="block text-xs text-slate-400 mb-1">Engine</label>
            <div className="grid grid-cols-3 gap-1">
              {([['sdxl', 'SDXL'], ['zimage', 'Z-Image'], ['klein', 'FLUX.2 klein']] as [Engine, string][]).map(([id, label]) => (
                <button key={id} onClick={() => setEngine(id)}
                  className={'px-2 py-1.5 rounded-md text-[11px] font-semibold border transition-all ' +
                    (engine === id ? 'bg-violet-500/20 border-violet-500/40 text-violet-300' : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white')}>
                  {label}
                </button>
              ))}
            </div>
            <p className="text-[10px] text-slate-600 mt-1">
              {engine === 'zimage' ? 'Best for posters, signs and concept art: spells text right. About 30 s.'
                : engine === 'klein' ? 'Most realistic surfaces and textures. About 15 s.'
                : 'Your SDXL checkpoints (JuggernautXL, RealVisXL).'}
            </p>
          </div>
        )}

        {modernFamily && modernNotReadyReason && (
          <div className="rounded-lg border border-amber-500/30 bg-amber-900/20 px-3 py-2 flex gap-2 text-xs text-amber-300">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>{modernNotReadyReason}{' '}
              {modern.online && modernFamilyStatus?.missingFiles.length ? (
                <button onClick={() => setMode('library')} className="underline text-amber-200">Open Models</button>
              ) : null}
            </span>
          </div>
        )}

        {mode !== 'library' && !modernFamily && (
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

        {(mode === 'transform' || mode === 'inpaint' || mode === 'seamless' || mode === 'edit') && (
          <div>
            <label className="block text-xs text-slate-400 mb-1">{mode === 'seamless' || mode === 'edit' ? 'Texture' : 'Source Image'}</label>
            {mode === 'inpaint' && sourceImage ? (
              <div className="relative rounded-xl border-2 border-violet-500/40 overflow-hidden">
                <img ref={imgRef} src={sourceImage} alt="Source" className="w-full rounded-xl object-contain max-h-64 pointer-events-none select-none"
                  onLoad={setupMaskCanvas} />
                <canvas
                  ref={maskCanvasRef}
                  className="absolute inset-0 w-full h-full opacity-40 cursor-crosshair"
                  onMouseDown={handleMaskDown} onMouseMove={handleMaskMove} onMouseUp={handleMaskUp} onMouseLeave={handleMaskUp}
                />
              </div>
            ) : (
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
            )}
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileInput} />
            {(mode === 'seamless' || mode === 'edit') && (
              <button onClick={() => setLibOpen(true)}
                className="mt-1.5 w-full flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-xs text-slate-300 hover:text-white hover:border-violet-500/40">
                <FolderOpen className="w-3.5 h-3.5" /> Pick from my texture library
              </button>
            )}
            {(mode === 'seamless' || mode === 'edit') && sourceLicence && (
              <div className={'mt-1.5 rounded-lg px-2 py-1.5 text-[10px] flex gap-1.5 ' + (sourceLicence.licence === 'cc0'
                ? 'bg-emerald-900/20 border border-emerald-500/30 text-emerald-300'
                : sourceLicence.licence === 'own' ? 'bg-sky-900/20 border border-sky-500/30 text-sky-300'
                : sourceLicence.licence === 'vanilla' ? 'bg-violet-900/20 border border-violet-500/30 text-violet-300'
                : 'bg-amber-900/20 border border-amber-500/30 text-amber-300')}>
                {sourceLicence.licence === 'cc0' ? <ShieldCheck className="w-3.5 h-3.5 flex-shrink-0" /> : <ShieldAlert className="w-3.5 h-3.5 flex-shrink-0" />}
                <span>{sourceLicence.licence === 'cc0'
                  ? `Safe to ship (CC0). ${sourceLicence.evidence}.`
                  : sourceLicence.licence === 'own' ? OWN_NOTE
                  : sourceLicence.licence === 'vanilla' ? VANILLA_NOTE
                  : `${LICENCE_LABEL[sourceLicence.licence]}: personal use only until you have checked the licence. Do not put it in a released mod without that. ${sourceLicence.evidence}.`}</span>
              </div>
            )}
            {sourceImage && (
              <button onClick={() => { setSourceImage(null); setSourceFile(null); setHasMask(false); setLibPath(null); setSourceLicence(null); }}
                className="mt-1 text-xs text-slate-500 hover:text-red-400 transition-colors">
                Clear image
              </button>
            )}
            {mode === 'inpaint' && sourceImage && (
              <div className="mt-2 space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-xs text-slate-400">Brush size: {brushSize}</label>
                  <button onClick={setupMaskCanvas} className="text-xs text-slate-500 hover:text-red-400">Clear mask</button>
                </div>
                <input type="range" min="10" max="120" value={brushSize} onChange={e => setBrushSize(parseInt(e.target.value, 10))}
                  className="w-full accent-violet-500" />
                <p className="text-[10px] text-slate-600">Paint over the area you want regenerated.</p>
              </div>
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
              <label className="flex items-center gap-2 text-xs text-slate-400 cursor-pointer">
                <input type="checkbox" checked={transparent} onChange={e => setTransparent(e.target.checked)}
                  className="accent-violet-500" />
                Generate with transparency
                <span className="text-slate-600">(LayeredDiffuse — native alpha channel)</span>
              </label>
              {transparent && layerDiffuseAvailable === false && (
                <div className="flex items-center gap-2 mt-1 text-xs text-red-400">
                  <XCircle className="w-3 h-3" /> ComfyUI-layerdiffuse not detected
                  <button onClick={installLayerDiffuse} disabled={layerDiffuseInstalling}
                    className="bg-violet-600 hover:bg-violet-700 disabled:bg-slate-600 text-white px-2 py-0.5 rounded text-xs">
                    {layerDiffuseInstalling ? 'Installing…' : 'Install'}
                  </button>
                </div>
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

        {mode === 'seamless' && (
          <div>
            <label className="block text-xs text-slate-400 mb-1">Describe the surface</label>
            <textarea value={prompt} onChange={e => setPrompt(e.target.value)} rows={3}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white resize-none focus:outline-none focus:border-violet-500 placeholder-slate-600"
              placeholder="e.g. rusted corrugated sheet metal, flaking pale green paint, vertical rust streaks" />
            <p className="text-[10px] text-slate-600 mt-1">
              Only the seams are repainted (a cross through the middle after shifting by half). Everything else stays exactly your
              pixels. Describe the material, not joints or bolts, or the AI may draw a panel joint on the old seam.
            </p>
          </div>
        )}

        {mode === 'edit' && (
          <div>
            <label className="block text-xs text-slate-400 mb-1">What to change</label>
            <textarea value={prompt} onChange={e => setPrompt(e.target.value)} rows={3}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white resize-none focus:outline-none focus:border-violet-500 placeholder-slate-600"
              placeholder="e.g. make the planks wet and darker with moss in the gaps. Keep every board and nail where it is." />
            <p className="text-[10px] text-slate-600 mt-1">
              FLUX.2 klein keeps the layout and changes the material. Editing loosens the tiling a little: use
              "Make it seamless" on the result afterwards. On UV-atlas textures (creatures, props) ask for material
              changes (wetter, older, mossier), not scene effects like rain or light rays: those get drawn across
              the UV islands.
            </p>
            <label className="mt-2 flex items-start gap-2 text-xs text-slate-300 cursor-pointer">
              <input type="checkbox" checked={keepDetail} onChange={e => setKeepDetail(e.target.checked)} className="accent-violet-500 mt-0.5" />
              <span>Keep real photo detail <span className="text-slate-500">(puts the photo's own pits, grain and scratches back at full
                size wherever the edit kept its shape; without it the result is about 1024 px and softer)</span></span>
            </label>
            {keepDetail && (
              <div className="mt-1.5 flex items-center gap-2 text-xs text-slate-400" title="2048 matches vanilla Fallout 4 textures. Full size keeps the photo's own resolution (up to 4096).">
                Output size
                {[[2048, '2048'], [0, 'Full size']].map(([v, label]) => (
                  <button key={String(v)} onClick={() => setOutSize(v as number)}
                    className={'px-2 py-1 rounded-md border text-[10px] ' + (outSize === v ? 'bg-violet-500/20 border-violet-500/40 text-violet-300' : 'bg-slate-800 border-slate-700 text-slate-400')}>
                    {label}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {(mode === 'transform' || mode === 'inpaint') && (
          <>
            <div>
              <label className="block text-xs text-slate-400 mb-1">
                Prompt <span className="text-slate-600">(optional)</span>
              </label>
              <textarea value={prompt} onChange={e => setPrompt(e.target.value)} rows={3}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white resize-none focus:outline-none focus:border-violet-500 placeholder-slate-600"
                placeholder={mode === 'inpaint' ? 'Describe what should replace the masked area...' : 'Leave blank for auto photorealism...'} />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs text-slate-400">{mode === 'inpaint' ? 'Inpaint Strength' : 'Transformation Strength'}</label>
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
            {!modernFamily && (
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
            )}

            <button onClick={handleGenerate}
              disabled={generating || comfyStatus !== 'online' || (modernFamily ? !!modernNotReadyReason : !selectedModel)}
              className="w-full py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white shadow-lg shadow-violet-900/30">
              {generating
                ? <><Loader2 className="w-4 h-4 animate-spin" />{mode === 'transform' ? 'Transforming...' : mode === 'inpaint' ? 'Inpainting...' : mode === 'seamless' ? 'Making seamless...' : mode === 'edit' ? 'Editing...' : 'Generating...'}</>
                : <><Zap className="w-4 h-4" />{mode === 'transform' ? 'Transform to Photorealistic' : mode === 'inpaint' ? 'Inpaint' : mode === 'seamless' ? 'Make Seamless' : mode === 'edit' ? 'Edit Texture' : 'Generate Image'}</>}
            </button>

            {error && (
              <div className="rounded-lg border border-red-500/30 bg-red-900/20 px-3 py-2 flex gap-2 text-xs text-red-300">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" /><span className="whitespace-pre-wrap break-words">{error}</span>
              </div>
            )}
          </>
        )}
      </div>

      {/* ── Main content ── */}
      {libOpen && (mode === 'seamless' || mode === 'edit') ? (
        <div className="flex-1 min-w-0 overflow-y-auto pb-4 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-white font-bold text-base flex items-center gap-2"><FolderOpen className="w-4 h-4 text-violet-400" /> My texture library</h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Start from a real photo texture or your own mod's textures and let the AI change it. <span className="text-emerald-300">CC0</span> textures
                are safe to put in a released mod, and so is <span className="text-sky-300">your own work</span>; <span className="text-violet-300">Fallout 4
                game textures</span> are for Fallout 4 mods only; everything else is for personal use until
                you have checked its licence. Nothing in these folders is changed.
              </p>
            </div>
            <button onClick={() => setLibOpen(false)} className="text-xs px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 hover:text-white">Close</button>
          </div>

          <div className="rounded-xl border border-slate-700 bg-slate-900/50 p-3 space-y-2">
            {libRoots.length === 0 && (
              <p className="text-[11px] text-slate-400">
                Add the folders where you keep textures: a photo texture library (Library), your own mods (My own work), or
                the textures you unpacked from Fallout 4's archives (Fallout 4 game files). Then click Scan. JPG, PNG, TIF and
                DDS are read; nothing in the folders is changed.
              </p>
            )}
            {libRoots.map(r => (
              <div key={r.path} className="flex items-center gap-2 text-xs">
                <FolderOpen className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
                <span className="flex-1 font-mono text-slate-300 truncate" title={r.path}>{r.path}</span>
                <select value={rootKind(r)} title={rootKind(r) === 'own' ? OWN_NOTE : rootKind(r) === 'game' ? VANILLA_NOTE : 'Sorted by licence evidence'}
                  onChange={e => setLibRoots(prev => prev.map(x => x.path === r.path ? kindToRoot(x.path, e.target.value as RootKind) : x))}
                  className="bg-slate-800 border border-slate-700 rounded px-1 py-0.5 text-[10px] text-slate-300">
                  {(Object.keys(KIND_LABEL) as RootKind[]).map(k => <option key={k} value={k}>{KIND_LABEL[k]}</option>)}
                </select>
                <button onClick={() => setLibRoots(prev => prev.filter(x => x.path !== r.path))} className="text-[10px] text-slate-500 hover:text-red-400">Remove</button>
              </div>
            ))}
            <div className="flex flex-wrap items-center gap-2">
              <input value={libRootInput} onChange={e => setLibRootInput(e.target.value)} placeholder="Add a texture folder, e.g. D:\Textures"
                className="flex-1 min-w-[220px] bg-slate-800 border border-slate-700 rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none focus:border-violet-500" />
              <button onClick={browseLibRoot} className="text-xs px-2 py-1.5 rounded bg-slate-700 hover:bg-slate-600 text-slate-300">Browse...</button>
              <select value={libRootKind} onChange={e => setLibRootKind(e.target.value as RootKind)}
                className="bg-slate-800 border border-slate-700 rounded px-1 py-1 text-[10px] text-slate-300">
                {(Object.keys(KIND_LABEL) as RootKind[]).map(k => <option key={k} value={k}>{KIND_LABEL[k]}</option>)}
              </select>
              <button onClick={addLibRoot} className="text-xs px-2 py-1.5 rounded bg-slate-700 hover:bg-slate-600 text-slate-300">Add</button>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={scanLibrary} disabled={libScanning || !libRoots.length}
                className="text-xs px-3 py-1.5 rounded bg-violet-600 hover:bg-violet-700 disabled:bg-slate-600 text-white flex items-center gap-1">
                {libScanning ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />} {lib.scanned ? 'Rescan all folders' : 'Scan'}
              </button>
              {lib.texconv === false && (
                <span className="text-[10px] text-amber-300">DDS textures are skipped until texconv is found: set your Fallout 4 folder in Settings (the Creation Kit installs it).</span>
              )}
            </div>
            {lib.scanned && lib.counts && (
              <div className="flex flex-wrap items-center gap-2 text-[10px]">
                <span className="text-slate-500">Last scan {lib.scannedAt?.slice(0, 10)}:</span>
                <span className="text-emerald-300">{lib.counts.cc0} safe to ship</span>
                <span className="text-violet-300">{lib.counts.vanilla ?? 0} Fallout 4 game files</span>
                <span className="text-sky-300">{lib.counts.own ?? 0} your own work</span>
                <span className="text-amber-300">{lib.counts.check} check licence</span>
                <span className="text-slate-400">{lib.counts.game} game files</span>
                <span className="text-slate-400">{lib.counts.unknown} unknown</span>
                <button onClick={exportNotShippable} className="ml-auto underline text-slate-400 hover:text-white">Save "not for shipping" list</button>
              </div>
            )}
            {libMsg && <p className="text-[11px] text-slate-300 break-words">{libMsg}</p>}
          </div>

          {lib.scanned && (
            <>
              <div className="flex flex-wrap items-center gap-2">
                {(['cc0', 'vanilla', 'own', 'check', 'unknown'] as LicenceClass[]).map(l => (
                  <button key={l} onClick={() => setLibLicences(prev => prev.includes(l) ? (prev.length > 1 ? prev.filter(x => x !== l) : prev) : [...prev, l])}
                    className={'px-2 py-1 rounded-md border text-[10px] ' + (libLicences.includes(l)
                      ? (l === 'cc0' ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300' : l === 'own' ? 'bg-sky-500/20 border-sky-500/40 text-sky-300' : l === 'vanilla' ? 'bg-violet-500/20 border-violet-500/40 text-violet-300' : 'bg-amber-500/20 border-amber-500/40 text-amber-300')
                      : 'bg-slate-800 border-slate-700 text-slate-500')}>
                    {LICENCE_LABEL[l]}
                  </button>
                ))}
                <select value={libCategory} onChange={e => setLibCategory(e.target.value)}
                  className="bg-slate-800 border border-slate-700 rounded-md px-2 py-1 text-[11px] text-white">
                  <option value="">All folders</option>
                  {(lib.categories || []).map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                <div className="flex items-center gap-1 bg-slate-800 border border-slate-700 rounded-md px-2">
                  <Search className="w-3 h-3 text-slate-500" />
                  <input value={libQuery} onChange={e => setLibQuery(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') void loadLibPage(0); }}
                    placeholder="Search (Enter)" className="bg-transparent py-1 text-[11px] text-white focus:outline-none w-32" />
                </div>
                <span className="text-[10px] text-slate-500 ml-auto">{libTotal.toLocaleString()} textures</span>
              </div>
              <div className="grid grid-cols-[repeat(auto-fill,minmax(120px,1fr))] gap-2">
                {libItems.map(it => (
                  <button key={it.path} onClick={() => void pickFromLibrary(it)} title={`${it.set}\\${it.name}\n${it.evidence}`}
                    className="rounded-lg border border-slate-700 bg-slate-900/60 hover:border-violet-500/60 overflow-hidden text-left">
                    <div className="aspect-square bg-slate-800">
                      {libThumbs[it.path] && <img src={libThumbs[it.path]} alt={it.name} className="w-full h-full object-cover" />}
                    </div>
                    <div className="px-1.5 py-1">
                      <div className="text-[10px] text-slate-200 truncate">{it.name}</div>
                      <div className={'text-[9px] ' + (it.licence === 'cc0' ? 'text-emerald-400' : it.licence === 'own' ? 'text-sky-400' : it.licence === 'vanilla' ? 'text-violet-400' : 'text-amber-400')}>{LICENCE_LABEL[it.licence]}</div>
                    </div>
                  </button>
                ))}
              </div>
              {libTotal > LIB_PAGE && (
                <div className="flex items-center justify-center gap-3 text-xs text-slate-400">
                  <button disabled={libOffset === 0} onClick={() => void loadLibPage(Math.max(0, libOffset - LIB_PAGE))} className="disabled:opacity-30 hover:text-white">Previous</button>
                  <span>{libOffset + 1}-{Math.min(libTotal, libOffset + LIB_PAGE)} of {libTotal.toLocaleString()}</span>
                  <button disabled={libOffset + LIB_PAGE >= libTotal} onClick={() => void loadLibPage(libOffset + LIB_PAGE)} className="disabled:opacity-30 hover:text-white">Next</button>
                </div>
              )}
            </>
          )}
        </div>
      ) : mode === 'library' ? (
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

            <div className="pt-2">
              <h3 className="text-white font-bold text-base">Z-Image-Turbo and FLUX.2 klein</h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Apache-2.0, free for any use. Needed for the Z-Image and FLUX.2 klein engines, Make Seamless (Z-Image) and
                Edit (klein). Needs an up-to-date ComfyUI{modern.comfyVersion ? ` (yours: ${modern.comfyVersion})` : ''}.
              </p>
            </div>
            {MODERN_FILES.map(f => {
              const missing = modernFileMissing(f.filename);
              const st = dlStates[f.id] ?? 'idle';
              const prog = dlProgress[f.filename];
              return (
                <div key={f.id} className="rounded-xl border border-slate-700 bg-slate-900/50 p-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-sm text-white font-semibold">{f.name}</div>
                      <div className="text-[10px] text-slate-500 font-mono truncate">{f.subfolder}/{f.filename}</div>
                      <div className="text-[10px] text-slate-500">~{(f.sizeMB / 1024).toFixed(1)} GB · used by {f.usedBy}</div>
                    </div>
                    {!modern.online ? (
                      <span className="text-xs text-slate-500">Start ComfyUI to check</span>
                    ) : !missing ? (
                      <span className="flex items-center gap-1.5 text-xs text-emerald-400"><CheckCircle2 className="w-3.5 h-3.5" /> Installed</span>
                    ) : st === 'downloading' ? (
                      <span className="flex items-center gap-1.5 text-xs text-violet-300"><Loader2 className="w-3.5 h-3.5 animate-spin" />
                        {prog && prog.total > 0 ? `${prog.percent}% · ${fmtBytes(prog.received)} / ${fmtBytes(prog.total)}` : 'Connecting...'}</span>
                    ) : (
                      <button onClick={() => downloadModernFile(f)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-violet-600 hover:bg-violet-500 text-xs text-white font-semibold">
                        <Download className="w-3.5 h-3.5" /> Download
                      </button>
                    )}
                  </div>
                  {dlErrors[f.id] && <div className="mt-1 text-[10px] text-red-400">{dlErrors[f.id]}</div>}
                </div>
              );
            })}

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
                {mode === 'seamless' && showTiled ? (
                  <div className="aspect-square h-full max-w-full rounded-xl" title="2 x 2 tiled preview"
                    style={{ backgroundImage: `url(${resultImage})`, backgroundRepeat: 'repeat', backgroundSize: '50% 50%' }} />
                ) : (
                  <img src={resultImage} alt="Generated" className="max-w-full max-h-full object-contain rounded-xl p-2" />
                )}
                {(mode === 'seamless' || mode === 'edit') && sourceLicence && sourceLicence.licence !== 'cc0' && sourceLicence.licence !== 'own' && sourceLicence.licence !== 'vanilla' && (
                  <div className="absolute top-3 right-3 max-w-[60%] rounded-lg bg-amber-900/90 border border-amber-500/40 px-3 py-1.5 text-[11px] text-amber-200 flex gap-1.5">
                    <ShieldAlert className="w-3.5 h-3.5 flex-shrink-0" /> Made from a texture that is not CC0: personal use only until you have checked its licence.
                  </div>
                )}
                {mode === 'seamless' && seamStats && (
                  <div className="absolute top-3 left-3 rounded-lg bg-slate-900/90 border border-slate-600 px-3 py-2 text-[11px] text-slate-300 space-y-0.5">
                    <div>Seams before: {seamStats.before.wrapLR}x left/right, {seamStats.before.wrapTB}x top/bottom</div>
                    <div className="text-emerald-300">Seams after: {seamStats.after.wrapLR}x left/right, {seamStats.after.wrapTB}x top/bottom</div>
                    <div className="text-slate-500">1.0x = invisible · grain {seamStats.grain} · {seamStats.seconds}s</div>
                  </div>
                )}
                <div className="absolute bottom-3 right-3 flex gap-2">
                  {mode === 'seamless' && (
                    <button onClick={() => setShowTiled(v => !v)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900/90 border border-slate-600 text-xs text-white hover:bg-slate-800 transition-colors">
                      <LayoutGrid className="w-3.5 h-3.5" /> {showTiled ? 'Single' : 'Tiled 2x2'}
                    </button>
                  )}
                  {mode === 'edit' && (
                    <button onClick={sendResultToSeamless}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900/90 border border-slate-600 text-xs text-white hover:bg-slate-800 transition-colors">
                      <LayoutGrid className="w-3.5 h-3.5" /> Make it seamless
                    </button>
                  )}
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
                    <p className="text-xs text-slate-600">{modernFamily ? 'Running on your ComfyUI' : 'SDXL on a single RTX 2070 takes 40-90 seconds'}</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <ImageIcon className="w-14 h-14 text-slate-700 mx-auto" />
                    <p className="text-slate-500 text-sm">Output image appears here</p>
                    <p className="text-slate-700 text-xs">
                      {mode === 'seamless'
                        ? 'Upload a texture, describe the surface, then click Make Seamless'
                        : mode === 'edit'
                        ? 'Upload a texture, say what to change, then click Edit Texture'
                        : mode === 'generate'
                        ? 'Pick a style preset or write a prompt, then click Generate'
                        : mode === 'inpaint'
                        ? 'Upload an image, paint a mask over the area to change, then click Inpaint'
                        : 'Upload a source image and click Transform to Photorealistic'}
                    </p>
                    {models.length === 0 && !modernFamily && (
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
          {comfyStatus === 'online' && models.length > 0 && !modernFamily && !generating && !resultImage && (
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
