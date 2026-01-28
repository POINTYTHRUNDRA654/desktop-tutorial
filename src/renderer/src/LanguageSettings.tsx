import React, { useEffect, useState } from 'react';
import { Save, Map, ExternalLink } from 'lucide-react';
import { resolveUiLanguage, useI18n } from './i18n';

function getElectronApi(): any {
  return (window as any)?.electron?.api ?? (window as any)?.electronAPI;
}

const REQUEST_LANGUAGE_URL =
  'https://github.com/POINTYTHRUNDRA654/desktop-tutorial/issues/new?labels=language-request&title=Language%20request%3A%20';

const LanguageSettings: React.FC = () => {
  const { t, lang, setUiLanguagePref } = useI18n();

  const [uiLanguage, setUiLanguage] = useState<string>('auto');
  const [saving, setSaving] = useState(false);

  const openUrl = async (url: string) => {
    try {
      const api = getElectronApi();
      if (typeof api?.openExternal === 'function') {
        await api.openExternal(url);
        return;
      }
    } catch {
      // ignore
    }

    try {
      window.open(url, '_blank', 'noopener,noreferrer');
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    const api = getElectronApi();
    if (!api?.getSettings) return;

    let disposed = false;
    const load = async () => {
      try {
        const s = await api.getSettings();
        if (disposed) return;
        setUiLanguage(String(s?.uiLanguage || 'auto'));
      } catch {
        // ignore
      }
    };

    void load();

    if (typeof api.onSettingsUpdated === 'function') {
      try {
        api.onSettingsUpdated((s: any) => {
          if (disposed) return;
          setUiLanguage(String(s?.uiLanguage || 'auto'));
        });
      } catch {
        // ignore
      }
    }

    return () => {
      disposed = true;
    };
  }, []);

  const onSave = async () => {
    const api = getElectronApi();
    if (!api?.setSettings) return;

    setSaving(true);
    try {
      await api.setSettings({ uiLanguage });
      if (uiLanguage === 'auto') {
        setUiLanguagePref('auto');
      } else {
        setUiLanguagePref(resolveUiLanguage(uiLanguage));
      }
    } finally {
      setSaving(false);
    }
  };

  const onChange = async (value: string) => {
    setUiLanguage(value);
    if (value === 'auto') {
      setUiLanguagePref('auto');
      return;
    }
    setUiLanguagePref(resolveUiLanguage(value));
  };

  return (
    <div className="h-full bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 overflow-hidden flex flex-col">
      <div className="p-6 border-b border-slate-700 bg-slate-800/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Map className="w-7 h-7 text-emerald-400" />
            <div>
              <h1 className="text-2xl font-bold text-white">{t('settings.language.title', 'Language Settings')}</h1>
              <p className="text-sm text-slate-400">{t('settings.language.subtitle', 'Choose the language used in the Mossy interface.')}</p>
            </div>
          </div>

          <button
            onClick={onSave}
            disabled={saving}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 text-white font-bold rounded-lg flex items-center gap-2 transition-colors"
            title="Save language settings"
          >
            <Save className="w-4 h-4" />
            {t('settings.language.save', 'Save')}
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        <div className="bg-black/40 border border-white/10 rounded-xl p-5">
          <div className="text-xs font-black text-white uppercase tracking-widest">{t('settings.language.uiLanguageLabel', 'App language')}</div>
          <div className="text-[11px] text-slate-400 mt-1">{t('settings.language.uiLanguageHelp', 'Affects labels, buttons, and UI text (where translated).')}</div>

          <div className="mt-4">
            <select
              value={uiLanguage}
              onChange={(e) => void onChange(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 text-white rounded-lg px-3 py-2"
            >
              <option value="auto">{t('settings.language.auto', 'Auto (system)')}</option>
              <option value="en">English</option>
              <option value="es">Español</option>
              <option value="fr">Français</option>
              <option value="de">Deutsch</option>
              <option value="ru">Русский</option>
              <option value="zh-Hans">中文（简体）</option>
            </select>
          </div>
        </div>

        <div className="bg-black/40 border border-white/10 rounded-xl p-5">
          <div className="text-xs font-black text-white uppercase tracking-widest">{t('settings.language.requestTitle', 'Request a language')}</div>
          <div className="text-[11px] text-slate-400 mt-1">{t('settings.language.requestHelp', 'Missing your language? Tell us which one to add next.')}</div>

          <div className="mt-4">
            <button
              onClick={() => void openUrl(REQUEST_LANGUAGE_URL)}
              className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-white font-semibold rounded-lg inline-flex items-center gap-2 transition-colors"
              title={t('settings.language.requestCtaTitle', 'Open the language request form')}
            >
              <ExternalLink className="w-4 h-4" />
              {t('settings.language.requestCta', 'Request a language')}
            </button>
          </div>
        </div>

        <div className="text-[11px] text-slate-500">
          {t('settings.language.current', 'Current')}: <span className="text-slate-300 font-mono">{String(lang || '')}</span>
        </div>
      </div>
    </div>
  );
};

export default LanguageSettings;
