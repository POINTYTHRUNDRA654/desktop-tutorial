/**
 * Background Remover — two backends, user's choice
 *
 * Isolate a texture design from its source photo — AI-powered background
 * removal, processed entirely on the user's own machine.
 *
 * BACKEND 1 — "Local" (BRIA AI RMBG-2.0, standalone Python subprocess):
 *   RMBG-2.0 is Creative Commons Attribution-NonCommercial 4.0 International
 *   (CC BY-NC 4.0) — verified directly against BRIA AI's actual GitHub
 *   LICENSE file and HuggingFace model card, not assumed. Only appropriate
 *   here because MOSSY.SPACE is and will remain free/non-commercial; revisit
 *   if that ever changes. The model is also GATED on HuggingFace — the user
 *   must personally log in, accept BRIA's license, and generate their own
 *   access token. Nothing here bypasses that consent step.
 *
 * BACKEND 2 — "ComfyUI" (1038lab/ComfyUI-RMBG custom node, GPL-3.0):
 *   Calls the user's own separately-installed, separately-running ComfyUI
 *   server over HTTP — same pattern AIImageStudio.tsx already uses for
 *   image generation. MOSSY.SPACE never bundles/links this GPL code.
 *   Defaults to BEN2 (independently verified MIT license) rather than this
 *   node's own "RMBG-2.0" option — that option's Apache-2.0 license claim
 *   contradicts BRIA's own authoritative CC BY-NC declaration (it pulls from
 *   an unofficial third-party mirror, not BRIA's real repo), so it's offered
 *   but flagged rather than trusted as default.
 */

import React, { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import { Scissors, ExternalLink, Loader2, CheckCircle2, XCircle, Trash2, ImageDown, ShieldAlert } from 'lucide-react';

type Backend = 'local' | 'comfyui';
type SetupStep = 'checking' | 'needs-install' | 'needs-token' | 'ready';

// RMBG-2.0 is deliberately NOT offered here: this node pulls it from an unofficial
// third-party mirror and labels it Apache-2.0, which contradicts BRIA's own
// authoritative CC BY-NC 4.0 declaration on their real repo (see
// feedback_rmbg_license_constraint memory). A license that doesn't check out
// gets removed, not offered with a warning.
const COMFY_MODELS: Array<{ id: string; label: string; note: string }> = [
  { id: 'BEN2', label: 'BEN2 (recommended)', note: 'MIT license — verified' },
  { id: 'INSPYRENET', label: 'InSPyReNet', note: 'MIT license — verified' },
  { id: 'BEN', label: 'BEN', note: 'MIT license — verified' },
];

interface FileResult {
  inputPath: string;
  success: boolean;
  outputPath?: string;
  error?: string;
  message?: string;
}

function getBridge(): any {
  return (window as any).electron?.api || (window as any).electronAPI;
}

const BackgroundRemover: React.FC = () => {
  const [backend, setBackend] = useState<Backend>('local');

  // Local (standalone RMBG-2.0) backend state
  const [step, setStep] = useState<SetupStep>('checking');
  const [device, setDevice] = useState<string>('');
  const [installLog, setInstallLog] = useState<string[]>([]);
  const [installing, setInstalling] = useState(false);
  const [tokenInput, setTokenInput] = useState('');
  const [savingToken, setSavingToken] = useState(false);

  // ComfyUI backend state
  const [comfyOnline, setComfyOnline] = useState<boolean | null>(null);
  const [comfyModel, setComfyModel] = useState('BEN2');

  // Shared file selection/processing state
  const [selectedPaths, setSelectedPaths] = useState<string[]>([]);
  const [processing, setProcessing] = useState(false);
  const [results, setResults] = useState<FileResult[]>([]);

  const refreshLocalStatus = useCallback(async () => {
    const bridge = getBridge();
    const status = await bridge?.bgRemover?.checkStatus();
    setDevice(status?.device || '');
    if (!status?.installed) setStep('needs-install');
    else if (!status?.hfTokenSet) setStep('needs-token');
    else setStep('ready');
  }, []);

  const refreshComfyStatus = useCallback(async () => {
    const bridge = getBridge();
    const status = await bridge?.invoke?.('textures:comfyui-status');
    setComfyOnline(!!status?.online);
  }, []);

  useEffect(() => {
    refreshLocalStatus();
    const bridge = getBridge();
    const unsubscribe = bridge?.bgRemover?.onSetupProgress((data: { message: string }) => {
      setInstallLog(prev => [...prev, data.message]);
    });
    return () => unsubscribe?.();
  }, [refreshLocalStatus]);

  useEffect(() => {
    if (backend === 'comfyui') refreshComfyStatus();
  }, [backend, refreshComfyStatus]);

  const handleInstall = async () => {
    setInstalling(true);
    setInstallLog([]);
    try {
      const bridge = getBridge();
      const result = await bridge?.bgRemover?.install();
      if (result?.success) {
        toast.success('Background Remover dependencies installed.');
        await refreshLocalStatus();
      } else {
        toast.error(result?.error || 'Install failed — see log below.');
      }
    } catch (error) {
      toast.error(`Install error: ${error}`);
    } finally {
      setInstalling(false);
    }
  };

  const handleSaveToken = async () => {
    if (!tokenInput.trim()) {
      toast.error('Paste your HuggingFace access token first.');
      return;
    }
    setSavingToken(true);
    try {
      const bridge = getBridge();
      const result = await bridge?.bgRemover?.setHfToken(tokenInput.trim());
      if (result?.success) {
        toast.success('HuggingFace token saved.');
        setTokenInput('');
        await refreshLocalStatus();
      } else {
        toast.error(result?.error || 'Failed to save token.');
      }
    } catch (error) {
      toast.error(`Error saving token: ${error}`);
    } finally {
      setSavingToken(false);
    }
  };

  const handlePickImages = async () => {
    const bridge = getBridge();
    const result = await bridge?.bgRemover?.pickImages();
    if (result?.success && result.paths?.length) {
      setSelectedPaths(result.paths);
      setResults([]);
    }
  };

  const handleRemoveBackgrounds = async () => {
    if (selectedPaths.length === 0) {
      toast.error('Pick one or more images first.');
      return;
    }
    setProcessing(true);
    setResults([]);
    try {
      const bridge = getBridge();
      let fileResults: FileResult[];

      if (backend === 'local') {
        const response = await bridge?.bgRemover?.removeBackground(selectedPaths);
        fileResults = response?.results || [];
      } else {
        fileResults = await Promise.all(selectedPaths.map(async (imagePath): Promise<FileResult> => {
          const r = await bridge?.invoke?.('bg-remover:comfyui-remove-background', { imagePath, model: comfyModel });
          return { inputPath: imagePath, success: !!r?.success, outputPath: r?.outputPath, error: r?.error, message: r?.message };
        }));
      }

      setResults(fileResults);
      const successCount = fileResults.filter(r => r.success).length;
      if (successCount === fileResults.length) {
        toast.success(`Background removed from ${successCount}/${fileResults.length} image(s).`);
      } else {
        toast.error(`${successCount}/${fileResults.length} succeeded — see details below.`);
      }
    } catch (error) {
      toast.error(`Error processing images: ${error}`);
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-4">
      <div className="flex items-center gap-3">
        <Scissors className="w-6 h-6 text-purple-400" />
        <h2 className="text-xl font-bold text-white">Background Remover</h2>
      </div>
      <p className="text-gray-400 text-sm">
        Isolate a texture design from its source photo — AI-powered background removal, processed
        entirely on your own machine.
      </p>

      {/* Backend selector */}
      <div className="flex gap-2">
        <button
          onClick={() => { setBackend('local'); setResults([]); }}
          className={`px-3 py-2 rounded text-sm ${backend === 'local' ? 'bg-purple-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}
        >
          Local (RMBG-2.0)
        </button>
        <button
          onClick={() => { setBackend('comfyui'); setResults([]); }}
          className={`px-3 py-2 rounded text-sm ${backend === 'comfyui' ? 'bg-purple-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}
        >
          ComfyUI (ComfyUI-RMBG)
        </button>
      </div>

      {backend === 'local' ? (
        <div className="bg-amber-900/20 border border-amber-700/40 rounded-lg p-3 text-xs text-amber-200">
          Powered by <strong>BRIA AI RMBG-2.0</strong> —{' '}
          <a href="https://huggingface.co/briaai/RMBG-2.0" target="_blank" rel="noreferrer" className="underline inline-flex items-center gap-1">
            CC BY-NC 4.0, non-commercial use only <ExternalLink className="w-3 h-3" />
          </a>
          . Only available because MOSSY.SPACE is free and non-commercial.
        </div>
      ) : (
        <div className="bg-blue-900/20 border border-blue-700/40 rounded-lg p-3 text-xs text-blue-200">
          Uses your own separately-installed{' '}
          <a href="https://github.com/1038lab/ComfyUI-RMBG" target="_blank" rel="noreferrer" className="underline inline-flex items-center gap-1">
            ComfyUI-RMBG <ExternalLink className="w-3 h-3" />
          </a>{' '}
          custom node (GPL-3.0). MOSSY.SPACE talks to your local ComfyUI server over HTTP — it doesn't bundle this code.
        </div>
      )}

      {backend === 'local' && (
        <>
          {step === 'checking' && (
            <div className="flex items-center gap-2 text-gray-400 text-sm">
              <Loader2 className="w-4 h-4 animate-spin" /> Checking setup…
            </div>
          )}

          {step === 'needs-install' && (
            <div className="bg-gray-800 rounded-lg p-4 space-y-3">
              <h3 className="text-white font-medium">Step 1: Install Dependencies</h3>
              <p className="text-gray-400 text-sm">
                Downloads torch, torchvision, transformers, pillow, and kornia (several GB, one-time).
                This runs on your own GPU if available.
              </p>
              <div className="flex items-start gap-2 bg-gray-900/60 rounded p-3 text-xs text-gray-400">
                <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5 text-yellow-500" />
                <span>
                  RMBG-2.0 loads custom model code from BRIA's HuggingFace repository (<code>trust_remote_code=True</code>).
                  Only proceed if you trust this source.
                </span>
              </div>
              <button
                onClick={handleInstall}
                disabled={installing}
                className="bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 text-white px-4 py-2 rounded flex items-center gap-2"
              >
                {installing ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                {installing ? 'Installing…' : 'Set Up Background Remover'}
              </button>
              {installLog.length > 0 && (
                <pre className="max-h-48 overflow-y-auto bg-black/30 rounded p-2 text-gray-300 text-xs whitespace-pre-wrap">
                  {installLog.join('\n')}
                </pre>
              )}
            </div>
          )}

          {step === 'needs-token' && (
            <div className="bg-gray-800 rounded-lg p-4 space-y-3">
              <h3 className="text-white font-medium">Step 2: HuggingFace Access Token</h3>
              <p className="text-gray-400 text-sm">
                RMBG-2.0 is a gated model — you must personally accept BRIA's license before it can be
                downloaded. This can't be automated:
              </p>
              <ol className="text-gray-300 text-sm list-decimal list-inside space-y-1">
                <li>
                  Log into HuggingFace and open{' '}
                  <a href="https://huggingface.co/briaai/RMBG-2.0" target="_blank" rel="noreferrer" className="text-purple-400 underline inline-flex items-center gap-1">
                    huggingface.co/briaai/RMBG-2.0 <ExternalLink className="w-3 h-3" />
                  </a>
                </li>
                <li>Click through and accept BRIA's license conditions on that page.</li>
                <li>
                  Generate an access token at{' '}
                  <a href="https://huggingface.co/settings/tokens" target="_blank" rel="noreferrer" className="text-purple-400 underline inline-flex items-center gap-1">
                    Settings → Access Tokens <ExternalLink className="w-3 h-3" />
                  </a>
                </li>
                <li>Paste that token below.</li>
              </ol>
              <div className="flex gap-2">
                <input
                  type="password"
                  value={tokenInput}
                  onChange={(e) => setTokenInput(e.target.value)}
                  placeholder="hf_..."
                  className="flex-1 bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white text-sm"
                />
                <button
                  onClick={handleSaveToken}
                  disabled={savingToken || !tokenInput.trim()}
                  className="bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 text-white px-4 py-2 rounded text-sm whitespace-nowrap"
                >
                  {savingToken ? 'Saving…' : 'Save Token'}
                </button>
              </div>
            </div>
          )}

          {step === 'ready' && device && (
            <div className="text-xs text-gray-400">
              Running on: <span className={device === 'cuda' ? 'text-green-400' : 'text-yellow-400'}>{device.toUpperCase()}</span>
            </div>
          )}
        </>
      )}

      {backend === 'comfyui' && (
        <>
          {comfyOnline === null && (
            <div className="flex items-center gap-2 text-gray-400 text-sm">
              <Loader2 className="w-4 h-4 animate-spin" /> Checking ComfyUI connection…
            </div>
          )}
          {comfyOnline === false && (
            <div className="bg-gray-800 rounded-lg p-4 text-sm text-gray-300 space-y-2">
              <p>ComfyUI isn't running (or isn't configured). Start your ComfyUI server, make sure the{' '}
                <a href="https://github.com/1038lab/ComfyUI-RMBG" target="_blank" rel="noreferrer" className="text-purple-400 underline">ComfyUI-RMBG</a>{' '}
                custom node is installed, then retry.</p>
              <button onClick={refreshComfyStatus} className="bg-gray-700 hover:bg-gray-600 text-white px-3 py-1.5 rounded text-sm">Retry</button>
            </div>
          )}
          {comfyOnline === true && (
            <div className="bg-gray-800 rounded-lg p-4 space-y-2">
              <label className="text-sm text-gray-300">Model</label>
              <select
                value={comfyModel}
                onChange={(e) => setComfyModel(e.target.value)}
                className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white text-sm"
              >
                {COMFY_MODELS.map(m => <option key={m.id} value={m.id}>{m.label} — {m.note}</option>)}
              </select>
            </div>
          )}
        </>
      )}

      {((backend === 'local' && step === 'ready') || (backend === 'comfyui' && comfyOnline === true)) && (
        <div className="bg-gray-800 rounded-lg p-4 space-y-3">
          <h3 className="text-white font-medium">Remove Backgrounds</h3>
          <div className="flex gap-2">
            <button
              onClick={handlePickImages}
              className="bg-gray-700 hover:bg-gray-600 text-white px-3 py-2 rounded text-sm"
            >
              Choose Image(s)…
            </button>
            <button
              onClick={handleRemoveBackgrounds}
              disabled={processing || selectedPaths.length === 0}
              className="bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white px-4 py-2 rounded text-sm flex items-center gap-2"
            >
              {processing ? <Loader2 className="w-4 h-4 animate-spin" /> : <ImageDown className="w-4 h-4" />}
              {processing ? 'Processing…' : `Remove Background (${selectedPaths.length})`}
            </button>
          </div>

          {selectedPaths.length > 0 && (
            <div className="space-y-1">
              {selectedPaths.map((p) => {
                const result = results.find(r => r.inputPath === p);
                return (
                  <div key={p} className="flex items-center justify-between bg-gray-700 rounded px-3 py-2 text-xs">
                    <span className="text-gray-300 truncate">{p}</span>
                    {result && (
                      result.success ? (
                        <span className="text-green-400 flex items-center gap-1 whitespace-nowrap">
                          <CheckCircle2 className="w-3 h-3" /> {result.outputPath}
                        </span>
                      ) : (
                        <span className="text-red-400 flex items-center gap-1 whitespace-nowrap" title={result.message}>
                          <XCircle className="w-3 h-3" /> {result.error}
                        </span>
                      )
                    )}
                  </div>
                );
              })}
              <button
                onClick={() => { setSelectedPaths([]); setResults([]); }}
                className="text-gray-400 hover:text-red-400 text-xs flex items-center gap-1"
              >
                <Trash2 className="w-3 h-3" /> Clear selection
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default BackgroundRemover;
