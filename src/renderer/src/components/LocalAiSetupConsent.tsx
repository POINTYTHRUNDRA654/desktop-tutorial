/**
 * Local AI Setup Consent
 *
 * Mossy can optionally install local Python AI dependencies (PyTorch for
 * local AI features, faster-whisper for voice input) so those features work
 * without any manual setup. Installing them downloads packages from the
 * internet (PyPI / Hugging Face) — a real network connection — so this is
 * never done silently. The main process asks once via IPC; nothing
 * downloads until the user explicitly clicks Install. Declining, or already
 * having these configured, means the user is never asked again.
 */
import React, { useEffect, useState } from 'react';
import { Download, X, HardDrive, ShieldCheck } from 'lucide-react';

interface ConsentRequest {
  needsPytorch: boolean;
  needsWhisper: boolean;
}

const LocalAiSetupConsent: React.FC = () => {
  const [request, setRequest] = useState<ConsentRequest | null>(null);
  const [responded, setResponded] = useState(false);

  useEffect(() => {
    const api = (window as any).electron?.api || (window as any).electronAPI;
    if (!api?.onLocalAiSetupConsentRequest) return;

    const unsubscribe = api.onLocalAiSetupConsentRequest((data: ConsentRequest) => {
      if (data && (data.needsPytorch || data.needsWhisper)) {
        setResponded(false);
        setRequest(data);
      }
    });

    return () => unsubscribe?.();
  }, []);

  const respond = (approved: boolean) => {
    const api = (window as any).electron?.api || (window as any).electronAPI;
    api?.respondLocalAiSetupConsent?.(approved);
    setResponded(true);
  };

  if (!request || responded) return null;

  const items: { name: string; size: string; source: string; license: string; purpose: string }[] = [];
  if (request.needsPytorch) {
    items.push({
      name: 'PyTorch',
      size: '~2-3 GB',
      source: 'PyPI (pypi.org)',
      license: 'BSD-3-Clause',
      purpose: 'Powers local AI image/analysis features',
    });
  }
  if (request.needsWhisper) {
    items.push({
      name: 'faster-whisper',
      size: '~1-2 GB (model weights)',
      source: 'PyPI (pypi.org) + Hugging Face',
      license: 'MIT',
      purpose: 'Powers voice input (speech-to-text)',
    });
  }

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-md rounded-lg border border-emerald-700/40 bg-[#0a0e0a] p-5 shadow-2xl">
        <div className="flex items-center gap-2 mb-3">
          <Download className="w-5 h-5 text-emerald-400" />
          <h2 className="text-sm font-black text-white">Install Local AI Tools?</h2>
        </div>
        <p className="text-xs text-slate-300 mb-4 leading-relaxed">
          Mossy can set up local AI tooling automatically so these features work with no manual configuration. Doing so downloads the following from the internet:
        </p>
        <div className="space-y-2 mb-4">
          {items.map((item) => (
            <div key={item.name} className="rounded-md border border-slate-700 bg-black/30 p-3">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-bold text-emerald-300">{item.name}</span>
                <span className="text-[10px] text-slate-400 flex items-center gap-1">
                  <HardDrive className="w-3 h-3" /> {item.size}
                </span>
              </div>
              <div className="text-[11px] text-slate-400">{item.purpose}</div>
              <div className="text-[10px] text-slate-500 mt-1">Source: {item.source} · License: {item.license}</div>
            </div>
          ))}
        </div>
        <p className="text-[11px] text-slate-500 mb-4 flex items-start gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5 flex-shrink-0 mt-0.5 text-slate-500" />
          Nothing downloads unless you click Install. You can skip this and set it up later from Settings → External Tools, or decline entirely — Mossy still works without these, just without local/offline voice and local AI-image features.
        </p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => respond(false)}
            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-md border border-slate-600 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-colors"
          >
            <X className="w-3.5 h-3.5" />
            Skip for Now
          </button>
          <button
            type="button"
            onClick={() => respond(true)}
            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-md bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-semibold transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            Install
          </button>
        </div>
      </div>
    </div>
  );
};

export default LocalAiSetupConsent;
