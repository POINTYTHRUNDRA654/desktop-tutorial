import React, { useState, useEffect } from 'react';
import { Sparkles, CheckCircle, AlertTriangle } from 'lucide-react';

interface ToolRequirement {
  id: string;
  name: string;
  description: string;
  status: 'checking' | 'ok' | 'missing' | 'error';
  canAutoFix: boolean;
  fixAction?: () => Promise<void>;
  details?: string;
}

interface AITextureToolsSetupWizardProps {
  onComplete?: () => void;
  onSkip?: () => void;
  embedded?: boolean;
}

/** ComfyUI custom-node tools this wizard can auto-install — real repos/licenses/model
 *  URLs verified directly (not guessed), same config PostProcessingPipeline.tsx and
 *  AIImageStudio.tsx already use against post-process:comfyui-install-node. */
const COMFYUI_TOOLS: Array<{
  id: string; name: string; description: string; owner: string; repo: string; checkClassType: string;
  modelDownloads?: Array<{ url: string; subfolder: string; filename: string }>;
  details?: string;
}> = [
  {
    id: 'bgremover-comfyui', name: 'Background Remover (ComfyUI)', description: 'ComfyUI-RMBG — BEN2/InSPyReNet/BEN background removal',
    owner: '1038lab', repo: 'ComfyUI-RMBG', checkClassType: 'RMBG',
  },
  {
    id: 'layerstyle', name: 'Layer Effects', description: 'Drop shadow, outer glow, color matching',
    owner: 'chflame163', repo: 'ComfyUI_LayerStyle', checkClassType: 'LayerStyle: DropShadow V3',
  },
  {
    id: 'impact-pack', name: 'Face Detailer (Impact Pack)', description: 'Automatic face detection + detail restoration',
    owner: 'ltdrdata', repo: 'ComfyUI-Impact-Pack', checkClassType: 'FaceDetailer',
    modelDownloads: [{ url: 'https://dl.fbaipublicfiles.com/segment_anything/sam_vit_b_01ec64.pth', subfolder: 'sams', filename: 'sam_vit_b_01ec64.pth' }],
  },
  {
    id: 'impact-subpack', name: 'Face Detailer (detector models)', description: 'Impact-Subpack — required companion package for Face Detailer',
    owner: 'ltdrdata', repo: 'ComfyUI-Impact-Subpack', checkClassType: 'UltralyticsDetectorProvider',
    modelDownloads: [{ url: 'https://huggingface.co/Bingsu/adetailer/resolve/main/face_yolov8m.pt', subfolder: 'ultralytics/bbox', filename: 'face_yolov8m.pt' }],
  },
  {
    id: 'iclight', name: 'Relight (IC-Light)', description: 'AI relighting for isolated subjects',
    owner: 'kijai', repo: 'ComfyUI-IC-Light', checkClassType: 'LoadAndApplyICLightUnet',
    modelDownloads: [{ url: 'https://huggingface.co/lllyasviel/ic-light/resolve/main/iclight_sd15_fc.safetensors', subfolder: 'unet', filename: 'iclight_sd15_fc.safetensors' }],
  },
  {
    id: 'supir', name: 'Upscale — SUPIR', description: 'Photo-realistic detail upscaling',
    owner: 'kijai', repo: 'ComfyUI-SUPIR', checkClassType: 'SUPIR_Upscale',
    modelDownloads: [{ url: 'https://huggingface.co/Kijai/SUPIR_pruned/resolve/main/SUPIR-v0Q_fp16.safetensors', subfolder: 'checkpoints', filename: 'SUPIR-v0Q_fp16.safetensors' }],
    details: 'SUPIR\'s model is under a custom non-commercial license (SupPixel Pty Ltd) — only usable here because MOSSY.SPACE is free/non-commercial.',
  },
  {
    id: 'ultimatesdupscale', name: 'Upscale — UltimateSDUpscale', description: 'Tiled upscaling using your own checkpoints',
    owner: 'ssitu', repo: 'ComfyUI_UltimateSDUpscale', checkClassType: 'UltimateSDUpscale',
  },
  {
    id: 'layerdiffuse', name: 'Transparent Generation (LayerDiffuse)', description: 'Native alpha-channel image generation',
    owner: 'huchenlei', repo: 'ComfyUI-layerdiffuse', checkClassType: 'LayeredDiffusionApply',
  },
  {
    id: 'inpaint-cropstitch', name: 'Inpaint Crop & Stitch', description: 'Faster, higher-quality masked inpainting',
    owner: 'lquesada', repo: 'ComfyUI-Inpaint-CropAndStitch', checkClassType: 'InpaintCropImproved',
  },
];

export const AITextureToolsSetupWizard: React.FC<AITextureToolsSetupWizardProps> = ({ onComplete = () => {}, onSkip = () => {}, embedded = false }) => {
  const [requirements, setRequirements] = useState<ToolRequirement[]>([]);
  const [isChecking, setIsChecking] = useState(true);
  const [currentFixing, setCurrentFixing] = useState<string | null>(null);

  const getElectronApi = () => (window as any)?.electron?.api ?? (window as any)?.electronAPI;

  useEffect(() => { checkRequirements(); }, []);

  const checkRequirements = async () => {
    setIsChecking(true);
    const api = getElectronApi();

    const reqs: ToolRequirement[] = [
      {
        id: 'bgremover-local', name: 'Background Remover (Local)', description: 'RMBG-2.0 — GPU background removal, runs entirely on your machine',
        status: 'checking', canAutoFix: true,
        details: 'CC BY-NC 4.0, gated on HuggingFace — needs your own token even after dependencies are installed. See the Background Remover tab.',
      },
      ...COMFYUI_TOOLS.map(t => ({
        id: t.id, name: t.name, description: t.description, status: 'checking' as const, canAutoFix: true, details: t.details,
      })),
    ];
    setRequirements(reqs);

    // Local RMBG-2.0 backend
    try {
      const status = await api?.bgRemover?.checkStatus?.();
      reqs[0].status = status?.installed ? (status?.hfTokenSet ? 'ok' : 'missing') : 'missing';
      if (status?.installed && !status?.hfTokenSet) {
        reqs[0].details = 'Dependencies installed. Add your HuggingFace token in the Background Remover tab to finish setup — that step can\'t be automated.';
      }
      reqs[0].fixAction = async () => {
        setCurrentFixing('bgremover-local');
        try {
          const r = await api?.bgRemover?.install?.();
          reqs[0].status = r?.success ? 'missing' : 'error'; // still 'missing' until the HF token is added by hand
          reqs[0].details = r?.success
            ? 'Dependencies installed. Add your HuggingFace token in the Background Remover tab to finish setup.'
            : `Install failed: ${r?.error || 'unknown error'}`;
        } catch (e) {
          reqs[0].status = 'error';
          reqs[0].details = `Install error: ${e}`;
        }
        setRequirements([...reqs]);
        setCurrentFixing(null);
      };
    } catch {
      reqs[0].status = 'error';
    }

    // ComfyUI connection (informational — not auto-fixable, just tells the user what's needed)
    let comfyOnline = false;
    try {
      const comfyStatus = await api?.invoke?.('textures:comfyui-status');
      comfyOnline = !!comfyStatus?.online;
    } catch { /* offline */ }

    // ComfyUI-dependent tools
    for (let i = 0; i < COMFYUI_TOOLS.length; i++) {
      const tool = COMFYUI_TOOLS[i];
      const req = reqs[i + 1];
      try {
        const check = await api?.invoke?.('post-process:comfyui-check-tool', tool.checkClassType);
        req.status = check?.available ? 'ok' : 'missing';
        if (!check?.available && !comfyOnline) {
          req.details = (req.details ? req.details + ' ' : '') + 'ComfyUI isn\'t running — installing will try to start it, or start it yourself first from AI Image Studio.';
        }
      } catch {
        req.status = 'missing';
      }
      req.fixAction = async () => {
        setCurrentFixing(tool.id);
        try {
          const r = await api?.invoke?.('post-process:comfyui-install-node', {
            owner: tool.owner, repo: tool.repo, checkClassType: tool.checkClassType, modelDownloads: tool.modelDownloads,
          });
          req.status = r?.success && r?.available ? 'ok' : 'error';
          if (!r?.success) req.details = `Install failed: ${r?.error || 'unknown error'}`;
        } catch (e) {
          req.status = 'error';
          req.details = `Install error: ${e}`;
        }
        setRequirements([...reqs]);
        setCurrentFixing(null);
      };
    }

    setRequirements([...reqs]);
    setIsChecking(false);
  };

  const handleFix = async (req: ToolRequirement) => { if (req.fixAction) await req.fixAction(); };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'ok': return <CheckCircle className="w-5 h-5 text-green-400" />;
      case 'missing': return <AlertTriangle className="w-5 h-5 text-yellow-400" />;
      case 'error': return <AlertTriangle className="w-5 h-5 text-red-400" />;
      default: return <div className="w-5 h-5 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ok': return 'text-green-400';
      case 'missing': return 'text-yellow-400';
      case 'error': return 'text-red-400';
      default: return 'text-slate-400';
    }
  };

  const allOk = requirements.every(r => r.status === 'ok');

  const wrapperClass = embedded
    ? 'bg-slate-900/95 border border-slate-700 rounded-2xl p-6'
    : 'fixed inset-0 bg-black/95 z-50 flex items-center justify-center p-8';

  const cardClass = embedded
    ? 'w-full'
    : 'max-w-2xl w-full max-h-[90vh] overflow-y-auto bg-slate-900/95 backdrop-blur-sm border border-slate-700 rounded-2xl p-8 shadow-2xl';

  return (
    <div className={wrapperClass}>
      <div className={cardClass}>
        <div className="text-center mb-8">
          <Sparkles className="w-16 h-16 mx-auto mb-4 text-purple-400" />
          <h1 className="text-3xl font-bold text-white mb-2">AI Texture Tools</h1>
          <p className="text-slate-300">
            Optional AI-powered tools for the Textures &amp; Materials Hub — background removal, layer effects,
            face detailing, relighting, upscaling, and more. All entirely optional and skippable.
          </p>
        </div>

        {isChecking ? (
          <div className="text-center py-8">
            <div className="w-8 h-8 border-4 border-purple-400 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-slate-300">Checking AI texture tools...</p>
          </div>
        ) : (
          <div className="space-y-3 mb-8">
            {requirements.map((req) => (
              <div key={req.id} className="bg-slate-800/50 border border-slate-700 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  {getStatusIcon(req.status)}
                  <div className="flex-1">
                    <h3 className={`font-semibold ${getStatusColor(req.status)}`}>{req.name}</h3>
                    <p className="text-slate-300 text-sm mb-2">{req.description}</p>
                    {req.details && <p className="text-slate-400 text-xs mb-3">{req.details}</p>}
                    {req.status === 'missing' && req.canAutoFix && (
                      <button
                        onClick={() => handleFix(req)}
                        disabled={currentFixing === req.id}
                        className="bg-purple-600 hover:bg-purple-700 disabled:bg-slate-600 text-white px-3 py-1 rounded text-sm transition-colors"
                      >
                        {currentFixing === req.id ? 'Installing...' : 'Auto Fix'}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="flex gap-4">
          <button onClick={onSkip} className="flex-1 bg-slate-700 hover:bg-slate-600 text-white py-3 rounded-lg transition-colors">
            Skip for Now
          </button>
          <button onClick={onComplete} className="flex-1 bg-purple-600 hover:bg-purple-700 text-white py-3 rounded-lg transition-colors">
            {allOk ? 'Continue' : 'Continue (Set Up Later)'}
          </button>
        </div>

        <p className="text-slate-400 text-sm text-center mt-4">
          Every tool here talks to your own separately-installed ComfyUI over HTTP — nothing is bundled into MOSSY.SPACE itself.
          You can always revisit this from the Textures &amp; Materials Hub tabs directly.
        </p>
      </div>
    </div>
  );
};
