import en from './locales/en.json';
import es from './locales/es.json';
import fr from './locales/fr.json';
import de from './locales/de.json';
import ru from './locales/ru.json';
import zhHans from './locales/zh-Hans.json';
import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';

type Lang = 'en' | 'es' | 'fr' | 'de' | 'ru' | 'zh-Hans';
export type UiLanguagePreference = 'auto' | Lang;

type Dict = Record<string, any>;

function getElectronApi(): any {
  return (window as any)?.electron?.api ?? (window as any)?.electronAPI;
}

function getNested(dict: Dict, key: string): unknown {
  const parts = key.split('.').filter(Boolean);
  let cur: any = dict;
  for (const p of parts) {
    if (!cur || typeof cur !== 'object') return undefined;
    cur = cur[p];
  }
  return cur;
}

export function resolveUiLanguage(value?: string): Lang {
  const raw = String(value || '').trim().toLowerCase();
  if (!raw || raw === 'auto') {
    const nav = (typeof navigator !== 'undefined' ? navigator.language : '') || '';
    const base = nav.split('-')[0].toLowerCase();
    if (base === 'es') return 'es';
    if (base === 'fr') return 'fr';
    if (base === 'de') return 'de';
    if (base === 'ru') return 'ru';
    if (base === 'zh') return 'zh-Hans';
    return 'en';
  }

  // Accept either exact supported tags (e.g. "zh-hans") or base tags (e.g. "zh").
  const normalized = raw.replace('_', '-');
  if (normalized === 'zh-hans') return 'zh-Hans';

  const base = normalized.split('-')[0];
  if (base === 'es') return 'es';
  if (base === 'fr') return 'fr';
  if (base === 'de') return 'de';
  if (base === 'ru') return 'ru';
  if (base === 'zh') return 'zh-Hans';
  return 'en';
}

const DICTS: Record<Lang, Dict> = {
  en: en as any,
  es: es as any,
  fr: fr as any,
  de: de as any,
  ru: ru as any,
  'zh-Hans': zhHans as any,
};

export type I18nContextValue = {
  lang: Lang;
  uiLanguagePref: UiLanguagePreference;
  setUiLanguagePref: (pref: UiLanguagePreference) => void;
  t: (key: string, fallback?: string) => string;
};

const I18nContext = createContext<I18nContextValue | null>(null);

export function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    return {
      lang: 'en',
      uiLanguagePref: 'auto',
      setUiLanguagePref: () => {},
      t: (_k: string, fallback?: string) => fallback || _k,
    };
  }
  return ctx;
}

export const I18nProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [uiLanguagePref, setUiLanguagePrefState] = useState<UiLanguagePreference>('auto');
  const [lang, setLang] = useState<Lang>(() => resolveUiLanguage('auto'));

  // Bootstrap from persisted settings + live updates.
  useEffect(() => {
    const api = getElectronApi();
    if (!api?.getSettings) return;

    let disposed = false;
    const load = async () => {
      try {
        const s = await api.getSettings();
        if (disposed) return;
        const pref = (String(s?.uiLanguage || 'auto') as UiLanguagePreference) || 'auto';
        setUiLanguagePrefState(pref);
        setLang(resolveUiLanguage(pref));
      } catch {
        // ignore
      }
    };

    void load();

    if (typeof api.onSettingsUpdated === 'function') {
      try {
        api.onSettingsUpdated((next: any) => {
          if (disposed) return;
          const pref = (String(next?.uiLanguage || 'auto') as UiLanguagePreference) || 'auto';
          setUiLanguagePrefState(pref);
          setLang(resolveUiLanguage(pref));
        });
      } catch {
        // ignore
      }
    }

    return () => {
      disposed = true;
    };
  }, []);

  const setUiLanguagePref = (pref: UiLanguagePreference) => {
    setUiLanguagePrefState(pref);
    setLang(resolveUiLanguage(pref));
  };

  const t = (key: string, fallback?: string): string => {
    const dict = DICTS[lang] || DICTS.en;
    const val = getNested(dict, key);
    if (typeof val === 'string' && val.trim()) return val;
    return fallback ?? key;
  };

  const value = useMemo<I18nContextValue>(() => ({ lang, uiLanguagePref, setUiLanguagePref, t }), [lang, uiLanguagePref]);

  // Avoid JSX here because this file is .ts (not .tsx)
  return React.createElement(I18nContext.Provider, { value }, children);
};
