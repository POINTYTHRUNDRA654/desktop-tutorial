import React, { useEffect, useState, useCallback } from 'react';
import toast from 'react-hot-toast';
import { Save, Cpu, Zap, RefreshCw } from 'lucide-react';

type AIEngineSettingsProps = {
  embedded?: boolean;
};

const GROQ_MODELS = [
  { value: 'llama-3.1-8b-instant', label: 'Llama 3.1 8B Instant (fastest, free tier)', tier: 'fast' },
  { value: 'llama-3.2-11b-vision-preview', label: 'Llama 3.2 11B Vision (images, free tier)', tier: 'fast' },
  { value: 'llama-3.3-70b-versatile', label: 'Llama 3.3 70B Versatile (best reasoning)', tier: 'smart' },
  { value: 'llama-3.2-90b-vision-preview', label: 'Llama 3.2 90B Vision (smartest + vision)', tier: 'smart' },
  { value: 'deepseek-r1-distill-llama-70b', label: 'DeepSeek R1 Distill 70B (chain-of-thought)', tier: 'smart' },
  { value: 'gemma2-9b-it', label: 'Gemma 2 9B Instruct (Google, compact)', tier: 'fast' },
  { value: 'mixtral-8x7b-32768', label: 'Mixtral 8x7B (32K context window)', tier: 'smart' },
];

const TOKEN_OPTIONS = [
  { value: 512, label: '512 — Short answers, fastest' },
  { value: 1024, label: '1024 — Balanced (default)' },
  { value: 2048, label: '2048 — Detailed answers' },
  { value: 4096, label: '4096 — Maximum detail, slowest' },
];

const AIEngineSettings: React.FC<AIEngineSettingsProps> = ({ embedded = false }) => {
  const api: any = (window as any).electron?.api || (window as any).electronAPI;
  const [groqPrimaryModel, setGroqPrimaryModel] = useState('llama-3.1-8b-instant');
  const [groqMaxResponseTokens, setGroqMaxResponseTokens] = useState(1024);
  const [groqSelfCritiqueEnabled, setGroqSelfCritiqueEnabled] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const s = await api?.getSettings?.();
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
  }, [api, groqPrimaryModel, groqMaxResponseTokens, groqSelfCritiqueEnabled]);

  if (!loaded) {
    return (
      <div className="flex items-center gap-2 text-slate-400 text-sm p-4">
        <RefreshCw className="w-4 h-4 animate-spin" />
        Loading…
      </div>
    );
  }

  const selectedModelInfo = GROQ_MODELS.find((m) => m.value === groqPrimaryModel);

  return (
    <div className={embedded ? '' : 'min-h-full bg-[#0b0f0b] text-slate-100 p-6'}>
      <div className="space-y-6 max-w-2xl">

        {/* Groq Model Selector */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 mb-1">
            <Cpu className="w-4 h-4 text-emerald-400" />
            <label className="text-sm font-bold text-slate-200">Primary Groq Model</label>
            {selectedModelInfo && (
              <span className={`text-[10px] px-2 py-0.5 rounded-full border font-mono ${
                selectedModelInfo.tier === 'fast'
                  ? 'bg-emerald-900/30 border-emerald-700/40 text-emerald-300'
                  : 'bg-amber-900/30 border-amber-700/40 text-amber-300'
              }`}>
                {selectedModelInfo.tier === 'fast' ? 'FAST' : 'SMART'}
              </span>
            )}
          </div>
          <p className="text-xs text-slate-400">
            This model is used for all Mossy chat responses. Fast models respond in ~1–2 s; smart models take 3–8 s but give much better answers on complex modding questions.
          </p>
          <select
            value={groqPrimaryModel}
            onChange={(e) => setGroqPrimaryModel(e.target.value)}
            className="w-full bg-slate-900 border border-slate-700 rounded-md px-3 py-2 text-sm text-slate-200 outline-none focus:border-emerald-600 transition-colors"
          >
            {GROQ_MODELS.map((m) => (
              <option key={m.value} value={m.value}>{m.label}</option>
            ))}
          </select>
          <div className="text-[11px] text-slate-500">
            Tip: use <span className="text-emerald-400 font-mono">llama-3.3-70b-versatile</span> for deep modding analysis and scripting; use <span className="text-emerald-400 font-mono">llama-3.1-8b-instant</span> for quick questions and real-time voice.
          </div>
        </div>

        {/* Max Response Tokens */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 mb-1">
            <Zap className="w-4 h-4 text-amber-400" />
            <label className="text-sm font-bold text-slate-200">Max Response Length</label>
          </div>
          <p className="text-xs text-slate-400">
            Controls how long Mossy's answers can be. Larger values allow complete code examples and step-by-step guides; smaller values are faster.
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
                After generating an answer, Mossy runs a second pass to find errors, gaps, or improvements — then refines the response before delivering it. Adds 3–6 seconds per response.
                Recommended only if you prefer accuracy over speed and are using a <span className="text-amber-300">Smart</span> model.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setGroqSelfCritiqueEnabled((v) => !v)}
              className={`flex-shrink-0 w-12 h-6 rounded-full transition-colors relative ${
                groqSelfCritiqueEnabled ? 'bg-purple-600' : 'bg-slate-700'
              }`}
              aria-label="Toggle self-critique"
            >
              <span
                className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                  groqSelfCritiqueEnabled ? 'translate-x-6' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
          {groqSelfCritiqueEnabled && (
            <div className="text-[11px] text-purple-300 bg-purple-900/20 border border-purple-700/30 rounded-md px-3 py-2">
              ✓ Self-critique is ON. Mossy will review and refine every answer before sending it.
              For best results pair this with <span className="font-mono">llama-3.3-70b-versatile</span>.
            </div>
          )}
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
            {saving ? 'Saving…' : 'Save AI Engine Settings'}
          </button>
        </div>

        {/* Info Box */}
        <div className="rounded-md border border-slate-700 bg-slate-800/30 p-4 text-xs text-slate-400 space-y-1">
          <div className="font-semibold text-slate-300">ℹ️ How Mossy's AI Engine works</div>
          <ul className="space-y-1 list-disc list-inside">
            <li>All chat goes through <strong className="text-slate-200">Groq Cloud</strong> — free API key required (groq.com/keys)</li>
            <li>The <strong className="text-slate-200">Primary Model</strong> you select is used for every answer</li>
            <li>If Groq rate-limits you, Mossy auto-falls back to a secondary model</li>
            <li>Local models (Ollama / LM Studio) are configured separately in <em>External Tools Settings</em></li>
            <li>Your Groq API key is stored encrypted on your machine and never sent anywhere except Groq</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default AIEngineSettings;
