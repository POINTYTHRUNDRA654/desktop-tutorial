import React, { useEffect, useState, useCallback } from 'react';
import toast from 'react-hot-toast';
import { Save, Cpu, Zap, RefreshCw, Radio } from 'lucide-react';

type AIEngineSettingsProps = {
  embedded?: boolean;
};

type ProviderOption = 'auto' | 'groq' | 'ollama' | 'openai_compat' | 'off';

const PROVIDER_OPTIONS: { value: ProviderOption; label: string; hint: string }[] = [
  { value: 'auto',         label: 'Auto',          hint: 'Use Groq; fall back to Ollama if Groq is unavailable' },
  { value: 'groq',         label: 'Groq (Cloud)',  hint: 'Always use Groq — fast cloud inference, free API tier' },
  { value: 'ollama',       label: 'Ollama (Local)', hint: 'Always use your local Ollama — 100% offline, no key needed' },
  { value: 'openai_compat',label: 'OpenAI',        hint: 'Use OpenAI API — requires OpenAI key configured in Step 2' },
  { value: 'off',          label: 'Off',           hint: 'Disable all AI features — responses return a placeholder' },
];

const GROQ_MODELS = [
  // Fast tier — sub-2s response
  { value: 'llama-3.1-8b-instant',          label: 'Llama 3.1 8B Instant — fastest, ~1s (free tier)',        tier: 'fast' },
  { value: 'llama3-8b-8192',                label: 'Llama 3 8B 8K — reliable & fast (free tier)',            tier: 'fast' },
  { value: 'gemma2-9b-it',                  label: 'Gemma 2 9B Instruct — Google, compact (free tier)',      tier: 'fast' },
  { value: 'gemma-7b-it',                   label: 'Gemma 7B Instruct — lightest Google model',              tier: 'fast' },
  // Smart tier — 3-8s, better for complex FO4 tasks
  { value: 'llama-3.3-70b-versatile',       label: 'Llama 3.3 70B Versatile — best reasoning (free tier)',  tier: 'smart' },
  { value: 'llama3-70b-8192',               label: 'Llama 3 70B 8K — proven 70B performance',               tier: 'smart' },
  { value: 'deepseek-r1-distill-llama-70b', label: 'DeepSeek R1 Distill 70B — chain-of-thought reasoning',  tier: 'smart' },
  { value: 'mixtral-8x7b-32768',            label: 'Mixtral 8x7B — 32K context, best for long scripts',     tier: 'smart' },
];

const TOKEN_OPTIONS = [
  { value: 512,  label: '512 — Short answers, fastest' },
  { value: 1024, label: '1024 — Balanced (default)' },
  { value: 2048, label: '2048 — Detailed answers' },
  { value: 4096, label: '4096 — Maximum detail, slowest' },
];

const AIEngineSettings: React.FC<AIEngineSettingsProps> = ({ embedded = false }) => {
  const api: any = (window as any).electron?.api || (window as any).electronAPI;

  const [provider, setProvider] = useState<ProviderOption>('auto');
  const [groqPrimaryModel, setGroqPrimaryModel] = useState('llama-3.1-8b-instant');
  const [groqMaxResponseTokens, setGroqMaxResponseTokens] = useState(1024);
  const [groqSelfCritiqueEnabled, setGroqSelfCritiqueEnabled] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const s = await api?.getSettings?.();
        setProvider((s?.localAiPreferredProvider as ProviderOption) || 'auto');
        setGroqPrimaryModel(s?.groqPrimaryModel || 'llama-3.1-8b-instant');
        setGroqMaxResponseTokens(s?.groqMaxResponseTokens ?? 1024);
        setGroqSelfCritiqueEnabled(s?.groqSelfCritiqueEnabled ?? false);
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
      await api.setSettings({
        localAiPreferredProvider: provider,
        groqPrimaryModel,
        groqMaxResponseTokens,
        groqSelfCritiqueEnabled,
      });
      toast.success('AI Engine settings saved');
    } catch (e: any) {
      toast.error(e?.message || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  }, [api, provider, groqPrimaryModel, groqMaxResponseTokens, groqSelfCritiqueEnabled]);

  if (!loaded) {
    return (
      <div className="flex items-center gap-2 text-slate-400 text-sm p-4">
        <RefreshCw className="w-4 h-4 animate-spin" />
        Loading...
      </div>
    );
  }

  const selectedModelInfo = GROQ_MODELS.find((m) => m.value === groqPrimaryModel);
  const groqActive = provider === 'auto' || provider === 'groq';

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
            Choose which AI backend Mossy uses for all chat and analysis.
            Groq is recommended — fast, free, and handles all FO4 modding questions well.
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

        {/* Groq-specific settings — dimmed when Groq is not active */}
        <div className={'space-y-6 transition-opacity ' + (!groqActive ? 'opacity-40 pointer-events-none select-none' : '')}>

          {/* Groq Model Selector */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 mb-1">
              <Cpu className="w-4 h-4 text-emerald-400" />
              <label className="text-sm font-bold text-slate-200">Primary Groq Model</label>
              {selectedModelInfo && (
                <span
                  className={
                    'text-[10px] px-2 py-0.5 rounded-full border font-mono ' +
                    (selectedModelInfo.tier === 'fast'
                      ? 'bg-emerald-900/30 border-emerald-700/40 text-emerald-300'
                      : 'bg-amber-900/30 border-amber-700/40 text-amber-300')
                  }
                >
                  {selectedModelInfo.tier === 'fast' ? 'FAST' : 'SMART'}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400">
              Used for all Mossy chat responses. Fast models respond in ~1-2s; smart models take
              3-8s but give much better answers on complex modding and scripting questions.
            </p>
            <select
              value={groqPrimaryModel}
              onChange={(e) => setGroqPrimaryModel(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-md px-3 py-2 text-sm text-slate-200 outline-none focus:border-emerald-600 transition-colors"
            >
              <optgroup label="Fast (sub-2s)">
                {GROQ_MODELS.filter((m) => m.tier === 'fast').map((m) => (
                  <option key={m.value} value={m.value}>{m.label}</option>
                ))}
              </optgroup>
              <optgroup label="Smart (3-8s, better reasoning)">
                {GROQ_MODELS.filter((m) => m.tier === 'smart').map((m) => (
                  <option key={m.value} value={m.value}>{m.label}</option>
                ))}
              </optgroup>
            </select>
            <div className="text-[11px] text-slate-500">
              Tip: use <span className="text-emerald-400 font-mono">llama-3.3-70b-versatile</span> for
              deep mod analysis and Papyrus scripting; use{' '}
              <span className="text-emerald-400 font-mono">llama-3.1-8b-instant</span> for quick
              questions and real-time voice.
            </div>
          </div>

          {/* Max Response Tokens */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 mb-1">
              <Zap className="w-4 h-4 text-amber-400" />
              <label className="text-sm font-bold text-slate-200">Max Response Length</label>
            </div>
            <p className="text-xs text-slate-400">
              Controls how long Mossy's answers can be. Larger values allow complete code examples
              and step-by-step guides; smaller values are faster.
            </p>
            <select
              value={groqMaxResponseTokens}
              onChange={(e) => setGroqMaxResponseTokens(Number(e.target.value))}
              className="w-full bg-slate-900 border border-slate-700 rounded-md px-3 py-2 text-sm text-slate-200 outline-none focus:border-emerald-600 transition-colors"
            >
              {TOKEN_OPTIONS.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>

          {/* Self-Critique Toggle */}
          <div className="space-y-2">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <RefreshCw className="w-4 h-4 text-purple-400" />
                  <span className="text-sm font-bold text-slate-200">Self-Critique Loop</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full border bg-purple-900/30 border-purple-700/40 text-purple-300 font-mono">BETA</span>
                </div>
                <p className="text-xs text-slate-400">
                  After generating an answer, Mossy runs a second pass to find errors, gaps, or
                  improvements — then refines the response before delivering it. Adds 3-6 seconds
                  per response. Recommended only if you prefer accuracy over speed and are using a{' '}
                  <span className="text-amber-300">Smart</span> model.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setGroqSelfCritiqueEnabled((v) => !v)}
                className={
                  'flex-shrink-0 w-12 h-6 rounded-full transition-colors relative ' +
                  (groqSelfCritiqueEnabled ? 'bg-purple-600' : 'bg-slate-700')
                }
                aria-label="Toggle self-critique"
              >
                <span
                  className={
                    'absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ' +
                    (groqSelfCritiqueEnabled ? 'translate-x-6' : 'translate-x-0')
                  }
                />
              </button>
            </div>
            {groqSelfCritiqueEnabled && (
              <div className="text-[11px] text-purple-300 bg-purple-900/20 border border-purple-700/30 rounded-md px-3 py-2">
                Self-critique is ON. Mossy will review and refine every answer before sending.
                For best results pair with <span className="font-mono">llama-3.3-70b-versatile</span>.
              </div>
            )}
          </div>

        </div>{/* end Groq-specific */}

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
            <li>All cloud chat goes through <strong className="text-slate-200">Groq</strong> — free API key required (console.groq.com/keys)</li>
            <li>The <strong className="text-slate-200">Provider</strong> selector at the top controls which backend is used</li>
            <li>If Groq rate-limits you, Mossy auto-falls back to a secondary model</li>
            <li>Local models (Ollama) are configured in the Ollama step below</li>
            <li>Your Groq API key is stored encrypted and never sent anywhere except Groq</li>
          </ul>
        </div>

      </div>
    </div>
  );
};

export default AIEngineSettings;
