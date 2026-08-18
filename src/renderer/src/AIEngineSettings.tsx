import React, { useEffect, useState, useCallback } from 'react';
import toast from 'react-hot-toast';
import { Save, Radio, RefreshCw, Key, Globe, Cpu, Brain, ShieldCheck } from 'lucide-react';

type AIEngineSettingsProps = {
  embedded?: boolean;
};

type ProviderOption = 'auto' | 'ollama' | 'off';

// Brain B removed 2026-08-15 (docs/ARCHITECTURE.md's "Target layer model") — it was
// never actually a generation provider, it's retrieval/classification/tutoring that
// wraps whichever provider generates. Making it a selectable choice here forced users
// to pick between "get scene-aware tutoring" and "use my preferred model," which were
// never actually in tension. Now: if Brain B is installed and running, its enrichment
// applies automatically no matter what's picked below — see the info box.
const PROVIDER_OPTIONS: { value: ProviderOption; label: string; hint: string }[] = [
  { value: 'auto',   label: 'Auto (Recommended)',  hint: 'Mossy uses the Render backend for all chat — fast, always up-to-date. Falls back to Ollama when offline, if it\'s running.' },
  { value: 'ollama', label: 'Local Only (Ollama)',  hint: 'Always use your local Ollama — 100% offline, no internet needed. Configure Ollama in the section below.' },
  { value: 'off',    label: 'Off',                  hint: 'Disable all AI features — responses return a placeholder.' },
];

const AIEngineSettings: React.FC<AIEngineSettingsProps> = ({ embedded = false }) => {
  const api: any = (window as any).electron?.api || (window as any).electronAPI;

  const [provider, setProvider] = useState<ProviderOption>('auto');
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);

  // Inkling (Thinking Machines) — used by Creative Director for all high-quality AI calls
  const [inklingApiKey, setInklingApiKey] = useState('');
  const [inklingBaseUrl, setInklingBaseUrl] = useState('https://api.tinker.thinkingmachines.ai/v1');
  const [inklingModel, setInklingModel] = useState('thinkingmachines/Inkling');
  const [inklingKeySet, setInklingKeySet] = useState(false);

  // Deliberate reasoning pre-pass + self-critique post-pass — both read by
  // LocalAIEngine.ts but previously had NO UI to actually turn them on; the
  // settings fields existed and were checked, just never set to true anywhere.
  const [deliberateReasoningEnabled, setDeliberateReasoningEnabled] = useState(true);
  const [selfCritiqueEnabled, setSelfCritiqueEnabled] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const s = await api?.getSettings?.();
        const raw = s?.localAiPreferredProvider as string;
        setProvider(raw === 'ollama' || raw === 'off' ? raw : 'auto');
        // Inkling — key is stored encrypted, renderer gets empty string back; detect via companion flag
        setInklingKeySet(Boolean(s?.inklingApiKeyEnc));
        setInklingBaseUrl(s?.inklingBaseUrl || 'https://api.tinker.thinkingmachines.ai/v1');
        setInklingModel(s?.inklingModel || 'thinkingmachines/Inkling');
        // Default ON (opt-out, not opt-in) — matches getDeliberateReasoningEnabled/
        // getSelfCritiqueEnabled in LocalAIEngine.ts treating "unset" as enabled.
        setDeliberateReasoningEnabled(s?.groqDeliberateReasoningEnabled !== false);
        setSelfCritiqueEnabled(s?.groqSelfCritiqueEnabled !== false);
        setLoaded(true);
      } catch {
        setLoaded(true);
      }
    };
    void load();
  }, [api]);

  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      if (!api?.setSettings) {
        toast.error('Settings API unavailable');
        return;
      }
      const payload: Record<string, string | boolean> = {
        localAiPreferredProvider: provider,
        aiProvider: provider === 'auto' ? 'auto' : provider,
        groqPrimaryModel: '',
        inklingBaseUrl,
        inklingModel,
        groqDeliberateReasoningEnabled: deliberateReasoningEnabled,
        groqSelfCritiqueEnabled: selfCritiqueEnabled,
      };
      // Only send the key if the user typed something new (empty = keep existing encrypted value)
      if (inklingApiKey.trim()) payload.inklingApiKey = inklingApiKey.trim();
      await api.setSettings(payload);
      if (inklingApiKey.trim()) {
        setInklingKeySet(true);
        setInklingApiKey('');
      }
      toast.success('AI Engine settings saved');
    } catch (e: any) {
      toast.error(e?.message || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  }, [api, provider, inklingApiKey, inklingBaseUrl, inklingModel, deliberateReasoningEnabled, selfCritiqueEnabled]);

  if (!loaded) {
    return (
      <div className="flex items-center gap-2 text-slate-400 text-sm p-4">
        <RefreshCw className="w-4 h-4 animate-spin" />
        Loading...
      </div>
    );
  }

  return (
    <div className={embedded ? '' : 'min-h-full bg-[#0b0f0b] text-slate-100 p-6'}>
      <div className="space-y-6 max-w-2xl">

        {/* AI Provider Selector */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 mb-1">
            <Radio className="w-4 h-4 text-cyan-400" />
            <label className="text-sm font-bold text-slate-200">AI Provider</label>
          </div>
          <p className="text-xs text-slate-400">
            Controls whether Mossy uses the cloud backend or your local Ollama for chat and analysis.
          </p>
          <div className="grid grid-cols-1 gap-2">
            {PROVIDER_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setProvider(opt.value)}
                className={
                  'flex items-start gap-3 px-4 py-3 rounded-md border text-left transition-colors ' +
                  (provider === opt.value
                    ? 'border-cyan-600 bg-cyan-900/20 text-cyan-200'
                    : 'border-slate-700 bg-slate-900/40 text-slate-300 hover:border-slate-600')
                }
              >
                <span
                  className={
                    'mt-0.5 w-3 h-3 rounded-full border-2 flex-shrink-0 ' +
                    (provider === opt.value ? 'border-cyan-400 bg-cyan-400' : 'border-slate-600')
                  }
                />
                <div>
                  <div className="text-xs font-bold">{opt.label}</div>
                  <div className="text-[11px] text-slate-400 mt-0.5">{opt.hint}</div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Inkling — Creative Director AI */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 mb-1">
            <Cpu className="w-4 h-4 text-violet-400" />
            <label className="text-sm font-bold text-slate-200">Inkling — Creative Director AI</label>
            {inklingKeySet && (
              <span className="text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded px-2 py-0.5">
                KEY SET
              </span>
            )}
          </div>
          <p className="text-xs text-slate-400">
            Inkling (975B/41B-active MoE, Thinking Machines) powers the Creative Director's analyst, script writer,
            record builder, and all specialist mod-building roles. Without a key, the team falls back to Groq → Ollama.
            Get an API key at{' '}
            <span className="text-violet-300 font-mono">tinker.thinkingmachines.ai</span>.
          </p>

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Key className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
              <label className="text-xs text-slate-400 w-24 flex-shrink-0">API Key</label>
              <input
                type="password"
                value={inklingApiKey}
                onChange={(e) => setInklingApiKey(e.target.value)}
                placeholder={inklingKeySet ? '••••••••  (leave blank to keep existing)' : 'github_pat_... or sk-...'}
                className="flex-1 bg-slate-800 border border-slate-600 rounded px-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-violet-500"
              />
            </div>
            <div className="flex items-center gap-2">
              <Globe className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
              <label className="text-xs text-slate-400 w-24 flex-shrink-0">Base URL</label>
              <input
                type="text"
                value={inklingBaseUrl}
                onChange={(e) => setInklingBaseUrl(e.target.value)}
                className="flex-1 bg-slate-800 border border-slate-600 rounded px-3 py-1.5 text-xs text-slate-200 font-mono focus:outline-none focus:border-violet-500"
              />
            </div>
            <div className="flex items-center gap-2">
              <Cpu className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
              <label className="text-xs text-slate-400 w-24 flex-shrink-0">Model</label>
              <input
                type="text"
                value={inklingModel}
                onChange={(e) => setInklingModel(e.target.value)}
                className="flex-1 bg-slate-800 border border-slate-600 rounded px-3 py-1.5 text-xs text-slate-200 font-mono focus:outline-none focus:border-violet-500"
              />
            </div>
          </div>
        </div>

        {/* Deliberate Reasoning + Self-Critique */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 mb-1">
            <Brain className="w-4 h-4 text-emerald-400" />
            <label className="text-sm font-bold text-slate-200">Deliberate Reasoning</label>
          </div>
          <p className="text-xs text-slate-400">
            Two extra passes around substantive answers (skipped for quick/trivial questions): a planning pass
            that breaks the question down and weighs approaches before answering, and a critique pass afterward
            that checks the answer for errors or gaps and revises it if needed.
          </p>
          <label className="flex items-start gap-3 px-4 py-3 rounded-md border border-slate-700 bg-slate-900/40 cursor-pointer hover:border-slate-600">
            <input
              type="checkbox"
              checked={deliberateReasoningEnabled}
              onChange={(e) => setDeliberateReasoningEnabled(e.target.checked)}
              className="mt-0.5 w-4 h-4 accent-emerald-500 flex-shrink-0"
            />
            <div>
              <div className="text-xs font-bold text-slate-200">Plan before answering</div>
              <div className="text-[11px] text-slate-400 mt-0.5">
                Breaks the question down, considers alternative approaches, and picks one before generating the real answer — instead of answering on the first instinct.
              </div>
            </div>
          </label>
          <label className="flex items-start gap-3 px-4 py-3 rounded-md border border-slate-700 bg-slate-900/40 cursor-pointer hover:border-slate-600">
            <input
              type="checkbox"
              checked={selfCritiqueEnabled}
              onChange={(e) => setSelfCritiqueEnabled(e.target.checked)}
              className="mt-0.5 w-4 h-4 accent-emerald-500 flex-shrink-0"
            />
            <div className="flex items-center gap-1.5">
              <ShieldCheck className="w-3 h-3 text-slate-400 flex-shrink-0" />
              <div>
                <div className="text-xs font-bold text-slate-200">Review after answering</div>
                <div className="text-[11px] text-slate-400 mt-0.5">
                  Re-checks the answer for factual errors or missing steps and revises it before you see it.
                </div>
              </div>
            </div>
          </label>
          <p className="text-[11px] text-slate-600">Both are on by default. Each adds one extra fast Groq call, only for substantive answers — trivial one-liners skip both.</p>
        </div>

        {/* Save Button */}
        <div className="pt-2">
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 rounded-md bg-emerald-700 hover:bg-emerald-600 disabled:opacity-50 text-white font-semibold text-sm transition-colors"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Saving...' : 'Save AI Engine Settings'}
          </button>
        </div>

        {/* Info Box */}
        <div className="rounded-md border border-slate-700 bg-slate-800/30 p-4 text-xs text-slate-400 space-y-1">
          <div className="font-semibold text-slate-300">How Mossy's AI Engine works</div>
          <ul className="space-y-1 list-disc list-inside">
            <li>All cloud chat routes through <strong className="text-slate-200">Mossy's backend</strong> — no API key needed on your end</li>
            <li>The backend handles model selection, rate limiting, and fallback automatically</li>
            <li>Local Ollama is the offline fallback — configure it in the Ollama section below</li>
            <li>Select <strong className="text-slate-200">Local Only</strong> if you want 100% offline operation</li>
            <li>Brain B (retrieval, citations, and tutoring — check-question cards, scene-aware answers) isn't a choice here: install and run it in the Brain B section below and it enriches every answer automatically, regardless of which provider above generates the text. Not installed or not running just means answers generate without it — nothing else changes.</li>
          </ul>
        </div>

      </div>
    </div>
  );
};

export default AIEngineSettings;
