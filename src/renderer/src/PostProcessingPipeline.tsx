/**
 * AI Post-Processing Pipeline — Layer Effects, Face Detailer, Relight, Upscale
 *
 * All four modes call the user's own separately-installed, separately-running
 * ComfyUI server over HTTP (same pattern as AIImageStudio.tsx and the
 * ComfyUI-RMBG backend in BackgroundRemover.tsx) — MOSSY.SPACE never bundles
 * or links any of these custom node packages.
 *
 * Every tool was license-checked directly against its real repo/LICENSE file:
 *   ComfyUI_LayerStyle (chflame163)              — MIT
 *   ComfyUI-Impact-Pack + -Subpack (ltdrdata)    — GPL-3.0, public models
 *   ComfyUI-IC-Light (kijai)                     — Apache-2.0, public model
 *   ComfyUI-SUPIR (kijai)                        — wrapper NOASSERTION; the SUPIR
 *     model itself is under a CUSTOM NON-COMMERCIAL license (SupPixel Pty Ltd) —
 *     usable here only because MOSSY.SPACE stays free/non-commercial, same basis
 *     as RMBG-2.0. See the amber notice in the Upscale panel below.
 *   ComfyUI_UltimateSDUpscale (ssitu)            — GPL-3.0, no bundled model
 */

import React, { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import { Layers, Smile, Sun, Maximize2, ExternalLink, Loader2, CheckCircle2, XCircle, Download, Box } from 'lucide-react';

type PPMode = 'layerfx' | 'facedetail' | 'relight' | 'upscale' | 'image3d';
type Checkpoint = { name: string; sizeMB: number };
type ModelDownload = { url: string; subfolder: string; filename: string };

function getBridge(): any {
  return (window as any).electron?.api || (window as any).electronAPI;
}

function useToolAvailable(classType: string | null): [boolean | null, () => void] {
  const [available, setAvailable] = useState<boolean | null>(null);
  const check = useCallback(() => {
    if (!classType) { setAvailable(null); return; }
    setAvailable(null);
    getBridge()?.invoke?.('post-process:comfyui-check-tool', classType).then((r: any) => {
      setAvailable(!!r?.available);
    });
  }, [classType]);
  useEffect(() => { check(); }, [check]);
  return [available, check];
}

/**
 * Shows install/available status for one ComfyUI custom node. When missing, offers a real
 * "Install" button — mirrors the app's existing precedent for auto-downloading GitHub-hosted
 * tools during setup (download-koboldcpp) rather than making the user manually clone/install
 * into their own ComfyUI. The downloaded node goes into the user's own separate ComfyUI
 * installation (custom_nodes/), never bundled into MOSSY.SPACE itself.
 */
function ToolStatus({ label, available, owner, repo, checkClassType, modelDownloads, onInstalled }: {
  label: string; available: boolean | null; owner: string; repo: string; checkClassType: string;
  modelDownloads?: ModelDownload[]; onInstalled: () => void;
}) {
  const [installing, setInstalling] = useState(false);
  const [log, setLog] = useState<string[]>([]);

  useEffect(() => {
    if (!installing) return;
    const unsubscribe = getBridge()?.on?.('post-process:install-progress', (data: { message: string }) => {
      setLog(prev => [...prev.slice(-30), data.message]);
    });
    return () => unsubscribe?.();
  }, [installing]);

  const install = async () => {
    setInstalling(true);
    setLog([]);
    try {
      const r = await getBridge()?.invoke?.('post-process:comfyui-install-node', { owner, repo, checkClassType, modelDownloads });
      if (r?.success) {
        if (r.available) toast.success(`${repo} installed and detected.`);
        else toast.error(`${repo} installed, but not yet detected — check the ComfyUI console.`);
        onInstalled();
      } else {
        toast.error(r?.error || `Failed to install ${repo}.`);
      }
    } catch (e) { toast.error(`Install error: ${e}`); }
    finally { setInstalling(false); }
  };

  if (available === null) return <div className="flex items-center gap-2 text-gray-400 text-xs"><Loader2 className="w-3 h-3 animate-spin" /> Checking {label}…</div>;
  if (available) return <div className="flex items-center gap-2 text-green-400 text-xs"><CheckCircle2 className="w-3 h-3" /> {label} detected</div>;
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between gap-2 text-red-400 text-xs">
        <span className="flex items-center gap-2"><XCircle className="w-3 h-3" /> {label} not found</span>
        <div className="flex items-center gap-2">
          <a href={`https://github.com/${owner}/${repo}`} target="_blank" rel="noreferrer" className="text-gray-500 underline inline-flex items-center gap-0.5">
            View repo <ExternalLink className="w-3 h-3" />
          </a>
          <button
            onClick={install}
            disabled={installing}
            className="bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 text-white px-2 py-1 rounded text-xs flex items-center gap-1"
          >
            {installing ? <Loader2 className="w-3 h-3 animate-spin" /> : <Download className="w-3 h-3" />}
            {installing ? 'Installing…' : 'Install'}
          </button>
        </div>
      </div>
      {log.length > 0 && (
        <pre className="max-h-32 overflow-y-auto bg-black/30 rounded p-2 text-gray-300 text-xs whitespace-pre-wrap">{log.join('\n')}</pre>
      )}
    </div>
  );
}

function useCheckpoints() {
  const [checkpoints, setCheckpoints] = useState<Checkpoint[]>([]);
  useEffect(() => {
    getBridge()?.invoke?.('textures:comfyui-list-checkpoints').then((r: any) => {
      if (r?.success) setCheckpoints(r.files || []);
    });
  }, []);
  return checkpoints;
}

const PostProcessingPipeline: React.FC = () => {
  const [mode, setMode] = useState<PPMode>('layerfx');

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-4">
      <div className="flex items-center gap-3">
        <Layers className="w-6 h-6 text-purple-400" />
        <h2 className="text-xl font-bold text-white">AI Post-Processing Pipeline</h2>
      </div>
      <p className="text-gray-400 text-sm">
        Layer effects, face detailing, relighting, and upscaling — all run through your own local ComfyUI.
      </p>

      <div className="flex gap-2 flex-wrap">
        {([
          ['layerfx', 'Layer Effects', Layers],
          ['facedetail', 'Face Detailer', Smile],
          ['relight', 'Relight', Sun],
          ['upscale', 'Upscale', Maximize2],
          ['image3d', 'Image to 3D', Box],
        ] as const).map(([id, label, Icon]) => (
          <button
            key={id}
            onClick={() => setMode(id)}
            className={`px-3 py-2 rounded text-sm flex items-center gap-2 ${mode === id ? 'bg-purple-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}
          >
            <Icon className="w-4 h-4" /> {label}
          </button>
        ))}
      </div>

      {mode === 'layerfx' && <LayerEffectsPanel />}
      {mode === 'facedetail' && <FaceDetailerPanel />}
      {mode === 'relight' && <RelightPanel />}
      {mode === 'upscale' && <UpscalePanel />}
      {mode === 'image3d' && <Image3DPanel />}
    </div>
  );
};

// ── Layer Effects ──────────────────────────────────────────────────────────
const LayerEffectsPanel: React.FC = () => {
  const [available, recheck] = useToolAvailable('LayerStyle: DropShadow V3');
  const [effect, setEffect] = useState<'drop_shadow' | 'outer_glow' | 'color_match'>('drop_shadow');
  const [imagePath, setImagePath] = useState('');
  const [backgroundPath, setBackgroundPath] = useState('');
  const [opacity, setOpacity] = useState(50);
  const [processing, setProcessing] = useState(false);
  const [outputPath, setOutputPath] = useState('');

  const pickImage = async (setter: (p: string) => void) => {
    const r = await getBridge()?.bgRemover?.pickImages();
    if (r?.success && r.paths?.[0]) setter(r.paths[0]);
  };

  const run = async () => {
    if (!imagePath) { toast.error('Choose an image first.'); return; }
    if (effect !== 'drop_shadow' && !backgroundPath) { toast.error(`${effect.replace('_', ' ')} needs a background/reference image.`); return; }
    setProcessing(true);
    setOutputPath('');
    try {
      const r = await getBridge()?.invoke?.('post-process:comfyui-layer-effects', {
        imagePath, backgroundPath: backgroundPath || undefined, effect, opacity,
      });
      if (r?.success) { setOutputPath(r.outputPath); toast.success('Effect applied.'); }
      else toast.error(r?.message || r?.error || 'Failed.');
    } catch (e) { toast.error(`Error: ${e}`); }
    finally { setProcessing(false); }
  };

  return (
    <div className="bg-gray-800 rounded-lg p-4 space-y-3">
      <ToolStatus
        label="ComfyUI_LayerStyle" available={available} onInstalled={recheck}
        owner="chflame163" repo="ComfyUI_LayerStyle" checkClassType="LayerStyle: DropShadow V3"
      />
      <select value={effect} onChange={e => setEffect(e.target.value as any)} className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white text-sm">
        <option value="drop_shadow">Drop Shadow</option>
        <option value="outer_glow">Outer Glow</option>
        <option value="color_match">Color Match (match to background)</option>
      </select>
      <div className="flex gap-2">
        <button onClick={() => pickImage(setImagePath)} className="flex-1 bg-gray-700 hover:bg-gray-600 text-white px-3 py-2 rounded text-sm truncate">
          {imagePath ? imagePath.split(/[\\/]/).pop() : 'Choose image…'}
        </button>
        <button onClick={() => pickImage(setBackgroundPath)} className="flex-1 bg-gray-700 hover:bg-gray-600 text-white px-3 py-2 rounded text-sm truncate">
          {backgroundPath ? backgroundPath.split(/[\\/]/).pop() : `Choose ${effect === 'drop_shadow' ? 'background (optional)' : 'background/reference'}…`}
        </button>
      </div>
      <label className="text-xs text-gray-400">Opacity: {opacity}</label>
      <input type="range" min={0} max={100} value={opacity} onChange={e => setOpacity(Number(e.target.value))} className="w-full" />
      <button
        onClick={run}
        disabled={processing || !available}
        className="bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 text-white px-4 py-2 rounded text-sm flex items-center gap-2"
      >
        {processing ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
        {processing ? 'Processing…' : 'Apply Effect'}
      </button>
      {outputPath && <div className="text-green-400 text-xs flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> {outputPath}</div>}
    </div>
  );
};

// ── Face Detailer ──────────────────────────────────────────────────────────
const FaceDetailerPanel: React.FC = () => {
  const [availPack, recheckPack] = useToolAvailable('FaceDetailer');
  const [availSubpack, recheckSubpack] = useToolAvailable('UltralyticsDetectorProvider');
  const checkpoints = useCheckpoints();
  const [imagePath, setImagePath] = useState('');
  const [checkpoint, setCheckpoint] = useState('');
  const [denoise, setDenoise] = useState(0.5);
  const [processing, setProcessing] = useState(false);
  const [outputPath, setOutputPath] = useState('');

  const ready = availPack && availSubpack;

  const pickImage = async () => {
    const r = await getBridge()?.bgRemover?.pickImages();
    if (r?.success && r.paths?.[0]) setImagePath(r.paths[0]);
  };

  const run = async () => {
    if (!imagePath || !checkpoint) { toast.error('Pick an image and a checkpoint first.'); return; }
    setProcessing(true);
    setOutputPath('');
    try {
      const r = await getBridge()?.invoke?.('post-process:comfyui-face-detailer', { imagePath, checkpoint, denoise });
      if (r?.success) { setOutputPath(r.outputPath); toast.success('Face detail complete.'); }
      else toast.error(r?.message || r?.error || 'Failed.');
    } catch (e) { toast.error(`Error: ${e}`); }
    finally { setProcessing(false); }
  };

  return (
    <div className="bg-gray-800 rounded-lg p-4 space-y-3">
      <ToolStatus
        label="ComfyUI-Impact-Pack" available={availPack} onInstalled={recheckPack}
        owner="ltdrdata" repo="ComfyUI-Impact-Pack" checkClassType="FaceDetailer"
        modelDownloads={[{ url: 'https://dl.fbaipublicfiles.com/segment_anything/sam_vit_b_01ec64.pth', subfolder: 'sams', filename: 'sam_vit_b_01ec64.pth' }]}
      />
      <ToolStatus
        label="ComfyUI-Impact-Subpack (also required)" available={availSubpack} onInstalled={recheckSubpack}
        owner="ltdrdata" repo="ComfyUI-Impact-Subpack" checkClassType="UltralyticsDetectorProvider"
        modelDownloads={[{ url: 'https://huggingface.co/Bingsu/adetailer/resolve/main/face_yolov8m.pt', subfolder: 'ultralytics/bbox', filename: 'face_yolov8m.pt' }]}
      />
      <button onClick={pickImage} className="w-full bg-gray-700 hover:bg-gray-600 text-white px-3 py-2 rounded text-sm truncate">
        {imagePath ? imagePath.split(/[\\/]/).pop() : 'Choose image…'}
      </button>
      <select value={checkpoint} onChange={e => setCheckpoint(e.target.value)} className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white text-sm">
        <option value="">Select checkpoint…</option>
        {checkpoints.map(c => <option key={c.name} value={c.name}>{c.name} ({c.sizeMB} MB)</option>)}
      </select>
      <label className="text-xs text-gray-400">Denoise: {denoise.toFixed(2)}</label>
      <input type="range" min={0} max={1} step={0.05} value={denoise} onChange={e => setDenoise(Number(e.target.value))} className="w-full" />
      <button
        onClick={run}
        disabled={processing || !ready}
        className="bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 text-white px-4 py-2 rounded text-sm flex items-center gap-2"
      >
        {processing ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
        {processing ? 'Processing…' : 'Detail Faces'}
      </button>
      {outputPath && <div className="text-green-400 text-xs flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> {outputPath}</div>}
    </div>
  );
};

// ── Relight ─────────────────────────────────────────────────────────────────
const RelightPanel: React.FC = () => {
  const [available, recheck] = useToolAvailable('LoadAndApplyICLightUnet');
  const checkpoints = useCheckpoints();
  const [imagePath, setImagePath] = useState('');
  const [checkpoint, setCheckpoint] = useState('');
  const [prompt, setPrompt] = useState('');
  const [processing, setProcessing] = useState(false);
  const [outputPath, setOutputPath] = useState('');

  const pickImage = async () => {
    const r = await getBridge()?.bgRemover?.pickImages();
    if (r?.success && r.paths?.[0]) setImagePath(r.paths[0]);
  };

  const run = async () => {
    if (!imagePath || !checkpoint) { toast.error('Pick an already-cutout image and an SD1.5 checkpoint first.'); return; }
    setProcessing(true);
    setOutputPath('');
    try {
      const r = await getBridge()?.invoke?.('post-process:comfyui-relight', { imagePath, checkpoint, positive: prompt || undefined });
      if (r?.success) { setOutputPath(r.outputPath); toast.success('Relit.'); }
      else toast.error(r?.message || r?.error || 'Failed.');
    } catch (e) { toast.error(`Error: ${e}`); }
    finally { setProcessing(false); }
  };

  return (
    <div className="bg-gray-800 rounded-lg p-4 space-y-3">
      <ToolStatus
        label="ComfyUI-IC-Light" available={available} onInstalled={recheck}
        owner="kijai" repo="ComfyUI-IC-Light" checkClassType="LoadAndApplyICLightUnet"
        modelDownloads={[{ url: 'https://huggingface.co/lllyasviel/ic-light/resolve/main/iclight_sd15_fc.safetensors', subfolder: 'unet', filename: 'iclight_sd15_fc.safetensors' }]}
      />
      <p className="text-gray-400 text-xs">Use an already-background-removed image (e.g. from the Background Remover tab) — IC-Light relights the isolated subject. Requires an SD1.5 checkpoint.</p>
      <button onClick={pickImage} className="w-full bg-gray-700 hover:bg-gray-600 text-white px-3 py-2 rounded text-sm truncate">
        {imagePath ? imagePath.split(/[\\/]/).pop() : 'Choose cutout image…'}
      </button>
      <select value={checkpoint} onChange={e => setCheckpoint(e.target.value)} className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white text-sm">
        <option value="">Select SD1.5 checkpoint…</option>
        {checkpoints.map(c => <option key={c.name} value={c.name}>{c.name} ({c.sizeMB} MB)</option>)}
      </select>
      <input
        type="text" value={prompt} onChange={e => setPrompt(e.target.value)}
        placeholder="Lighting description, e.g. 'warm sunset light from the left'"
        className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white text-sm"
      />
      <button
        onClick={run}
        disabled={processing || !available}
        className="bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 text-white px-4 py-2 rounded text-sm flex items-center gap-2"
      >
        {processing ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
        {processing ? 'Processing…' : 'Relight'}
      </button>
      {outputPath && <div className="text-green-400 text-xs flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> {outputPath}</div>}
    </div>
  );
};

// ── Upscale ─────────────────────────────────────────────────────────────────
const UpscalePanel: React.FC = () => {
  const [method, setMethod] = useState<'supir' | 'ultimate'>('ultimate');
  const [availSupir, recheckSupir] = useToolAvailable(method === 'supir' ? 'SUPIR_Upscale' : null);
  const [availUltimate, recheckUltimate] = useToolAvailable(method === 'ultimate' ? 'UltimateSDUpscale' : null);
  const available = method === 'supir' ? availSupir : availUltimate;
  const checkpoints = useCheckpoints();
  const [imagePath, setImagePath] = useState('');
  const [checkpoint, setCheckpoint] = useState('');
  const [sdxlModel, setSdxlModel] = useState('');
  const [scaleBy, setScaleBy] = useState(2);
  const [processing, setProcessing] = useState(false);
  const [outputPath, setOutputPath] = useState('');

  const pickImage = async () => {
    const r = await getBridge()?.bgRemover?.pickImages();
    if (r?.success && r.paths?.[0]) setImagePath(r.paths[0]);
  };

  const run = async () => {
    if (!imagePath) { toast.error('Choose an image first.'); return; }
    if (method === 'ultimate' && !checkpoint) { toast.error('Pick a checkpoint first.'); return; }
    if (method === 'supir' && !sdxlModel) { toast.error('Pick an SDXL checkpoint for SUPIR first.'); return; }
    setProcessing(true);
    setOutputPath('');
    try {
      const r = await getBridge()?.invoke?.('post-process:comfyui-upscale', {
        imagePath, method, checkpoint: method === 'ultimate' ? checkpoint : undefined,
        sdxlModel: method === 'supir' ? sdxlModel : undefined, scaleBy,
      });
      if (r?.success) { setOutputPath(r.outputPath); toast.success('Upscaled.'); }
      else toast.error(r?.message || r?.error || 'Failed.');
    } catch (e) { toast.error(`Error: ${e}`); }
    finally { setProcessing(false); }
  };

  return (
    <div className="bg-gray-800 rounded-lg p-4 space-y-3">
      <div className="flex gap-2">
        <button onClick={() => setMethod('ultimate')} className={`flex-1 px-3 py-2 rounded text-sm ${method === 'ultimate' ? 'bg-purple-600 text-white' : 'bg-gray-700 text-gray-300'}`}>
          UltimateSDUpscale
        </button>
        <button onClick={() => setMethod('supir')} className={`flex-1 px-3 py-2 rounded text-sm ${method === 'supir' ? 'bg-purple-600 text-white' : 'bg-gray-700 text-gray-300'}`}>
          SUPIR
        </button>
      </div>

      {method === 'supir' ? (
        <div className="bg-amber-900/20 border border-amber-700/40 rounded-lg p-3 text-xs text-amber-200">
          <strong>SUPIR</strong> is under a custom non-commercial license from SupPixel Pty Ltd —{' '}
          <a href="https://github.com/Fanghua-Yu/SUPIR/blob/master/LICENSE" target="_blank" rel="noreferrer" className="underline inline-flex items-center gap-1">
            real LICENSE <ExternalLink className="w-3 h-3" />
          </a>
          . Only available because MOSSY.SPACE is free and non-commercial; commercial use requires a paid agreement with SupPixel.
        </div>
      ) : (
        <ToolStatus
          label="ComfyUI_UltimateSDUpscale" available={availUltimate} onInstalled={recheckUltimate}
          owner="ssitu" repo="ComfyUI_UltimateSDUpscale" checkClassType="UltimateSDUpscale"
        />
      )}
      {method === 'supir' && (
        <ToolStatus
          label="ComfyUI-SUPIR" available={availSupir} onInstalled={recheckSupir}
          owner="kijai" repo="ComfyUI-SUPIR" checkClassType="SUPIR_Upscale"
          modelDownloads={[{ url: 'https://huggingface.co/Kijai/SUPIR_pruned/resolve/main/SUPIR-v0Q_fp16.safetensors', subfolder: 'checkpoints', filename: 'SUPIR-v0Q_fp16.safetensors' }]}
        />
      )}

      <button onClick={pickImage} className="w-full bg-gray-700 hover:bg-gray-600 text-white px-3 py-2 rounded text-sm truncate">
        {imagePath ? imagePath.split(/[\\/]/).pop() : 'Choose image…'}
      </button>

      {method === 'ultimate' ? (
        <select value={checkpoint} onChange={e => setCheckpoint(e.target.value)} className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white text-sm">
          <option value="">Select checkpoint…</option>
          {checkpoints.map(c => <option key={c.name} value={c.name}>{c.name} ({c.sizeMB} MB)</option>)}
        </select>
      ) : (
        <select value={sdxlModel} onChange={e => setSdxlModel(e.target.value)} className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white text-sm">
          <option value="">Select SDXL checkpoint…</option>
          {checkpoints.map(c => <option key={c.name} value={c.name}>{c.name} ({c.sizeMB} MB)</option>)}
        </select>
      )}

      <label className="text-xs text-gray-400">Scale: {scaleBy}x</label>
      <input type="range" min={1} max={4} step={0.5} value={scaleBy} onChange={e => setScaleBy(Number(e.target.value))} className="w-full" />

      <button
        onClick={run}
        disabled={processing || !available}
        className="bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 text-white px-4 py-2 rounded text-sm flex items-center gap-2"
      >
        {processing ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
        {processing ? 'Processing…' : 'Upscale'}
      </button>
      {outputPath && <div className="text-green-400 text-xs flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> {outputPath}</div>}
    </div>
  );
};

// -- Image to 3D (flowtyone/ComfyUI-Flowty-TripoSR) --------------------------
const Image3DPanel: React.FC = () => {
  const [available, recheck] = useToolAvailable('TripoSRModelLoader');
  const checkpoints = useCheckpoints();
  const [imagePath, setImagePath] = useState('');
  const [model, setModel] = useState('');
  const [resolution, setResolution] = useState(256);
  const [processing, setProcessing] = useState(false);
  const [outputPath, setOutputPath] = useState('');

  // TripoSR's own model dropdown pulls from the same shared checkpoints/
  // folder as every SDXL checkpoint (that's how the upstream node works) --
  // default to whichever entry actually looks like the TripoSR download
  // rather than making Billy hunt for it in a list of SDXL files.
  useEffect(() => {
    if (model || checkpoints.length === 0) return;
    const guess = checkpoints.find(c => /triposr/i.test(c.name));
    if (guess) setModel(guess.name);
  }, [checkpoints, model]);

  const pickImage = async () => {
    const r = await getBridge()?.bgRemover?.pickImages();
    if (r?.success && r.paths?.[0]) setImagePath(r.paths[0]);
  };

  const run = async () => {
    if (!imagePath || !model) { toast.error('Pick an image and the TripoSR checkpoint first.'); return; }
    setProcessing(true);
    setOutputPath('');
    try {
      const r = await getBridge()?.invoke?.('post-process:comfyui-image-to-3d', { imagePath, model, resolution });
      if (r?.success) { setOutputPath(r.outputPath); toast.success('3D mesh generated.'); }
      else toast.error(r?.message || r?.error || 'Failed.');
    } catch (e) { toast.error(`Error: ${e}`); }
    finally { setProcessing(false); }
  };

  return (
    <div className="bg-gray-800 rounded-lg p-4 space-y-3">
      <ToolStatus
        label="ComfyUI-Flowty-TripoSR" available={available} onInstalled={recheck}
        owner="flowtyone" repo="ComfyUI-Flowty-TripoSR" checkClassType="TripoSRModelLoader"
        modelDownloads={[{ url: 'https://huggingface.co/stabilityai/TripoSR/resolve/main/model.ckpt', subfolder: 'checkpoints', filename: 'TripoSR_model.ckpt' }]}
      />
      <p className="text-gray-400 text-xs">
        stabilityai/TripoSR (MIT) -- fast single-image-to-mesh reconstruction, free and fully local.
        Bakes vertex colors onto the geometry rather than a proper UV-textured material, so treat this as a quick base
        mesh / concept-proofing tool rather than a drop-in game-ready asset. Works best on an already-background-removed
        (transparent) image -- e.g. run it through Background Remover or Texture Enhancer's "Remove background after
        generation" step first, since the isolated subject reconstructs much more cleanly than one still on a background.
      </p>
      <button onClick={pickImage} className="w-full bg-gray-700 hover:bg-gray-600 text-white px-3 py-2 rounded text-sm truncate">
        {imagePath ? imagePath.split(/[\\/]/).pop() : 'Choose image (transparent cutout recommended)…'}
      </button>
      <select value={model} onChange={e => setModel(e.target.value)} className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white text-sm">
        <option value="">Select TripoSR checkpoint…</option>
        {checkpoints.map(c => <option key={c.name} value={c.name}>{c.name} ({c.sizeMB} MB)</option>)}
      </select>
      <label className="text-xs text-gray-400">Mesh resolution: {resolution} (higher = more geometric detail, slower)</label>
      <input type="range" min={128} max={512} step={32} value={resolution} onChange={e => setResolution(Number(e.target.value))} className="w-full" />
      <button
        onClick={run}
        disabled={processing || !available}
        className="bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 text-white px-4 py-2 rounded text-sm flex items-center gap-2"
      >
        {processing ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
        {processing ? 'Reconstructing…' : 'Generate 3D Mesh (.obj)'}
      </button>
      {outputPath && <div className="text-green-400 text-xs flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> {outputPath}</div>}
    </div>
  );
};

export default PostProcessingPipeline;
