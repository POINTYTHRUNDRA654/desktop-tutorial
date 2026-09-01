import React, { useState, useEffect } from 'react';
import { ArrowLeft, CheckCircle, Sparkles } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import packageJson from '../../../package.json';
import { useI18n } from './i18n';

interface WhatsNewPageProps {
  onDismiss?: () => void;
}

interface WhatsNewFeatureItem {
  title: string;
  description: string;
  icon: string;
}

interface WhatsNewEntry {
  version: string;
  features?: WhatsNewFeatureItem[];
  highlights?: string[];
}

const WhatsNewPage: React.FC<WhatsNewPageProps> = ({ onDismiss }) => {
  const { t } = useI18n();
  const navigate = useNavigate();
  const location = useLocation();
  const [dontShowAgain, setDontShowAgain] = useState(false);
  const [entry, setEntry] = useState<WhatsNewEntry | null>(null);
  const [loading, setLoading] = useState(true);
  const [fallbackInfo, setFallbackInfo] = useState<{ used: boolean; requestedVersion: string; resolvedVersion: string | null } | null>(null);

  // Load current version's What's New entry from server
  useEffect(() => {
    const loadWhatsNew = async () => {
      try {
        setLoading(true);
        const result = await window.electron.api.invoke('whats-new-get-current');
        
        if (result?.ok) {
          setEntry(result.entry || null);
          setFallbackInfo(result.fallback || null);
          // Mark current version as seen
          await window.electron.api.invoke('whats-new-mark-seen', { 
            version: packageJson.version 
          });
        }
      } catch (err) {
        console.warn('[WhatsNewPage] Failed to load What\'s New:', err);
      } finally {
        setLoading(false);
      }
    };

    loadWhatsNew();
  }, []);

  const features: WhatsNewFeatureItem[] = Array.isArray(entry?.features) ? entry.features : [];
  const highlights: string[] = Array.isArray(entry?.highlights) ? entry.highlights : [];

  const handleBack = () => {
    if (dontShowAgain) {
      try {
        // Dismiss this version via backend
        window.electron.api.invoke('whats-new-dismiss', { 
          version: packageJson.version 
        }).catch(err => console.warn('[WhatsNewPage] Failed to dismiss:', err));
        
        // Also store locally as fallback
        localStorage.setItem('mossy_whats_new_dismissed_version', packageJson.version);
        localStorage.removeItem('mossy_whats_new_dismissed');
      } catch (err) {
        console.warn('[WhatsNewPage] could not persist dismissal:', err);
      }
    }

    onDismiss?.();

    const from = (location.state as { from?: string } | null)?.from;
    if (from && from !== '/whats-new') {
      navigate(from, { replace: true });
      return;
    }
    navigate('/', { replace: true });
  };

  return (
    <div className="h-full w-full overflow-y-auto bg-[#0a0e0a] text-slate-100">
      <div
        className="relative isolate overflow-hidden"
        style={{
          background:
            'radial-gradient(circle at 20% 20%, rgba(0, 255, 153, 0.18), transparent 45%),\n' +
            'radial-gradient(circle at 80% 10%, rgba(0, 135, 255, 0.2), transparent 40%),\n' +
            'linear-gradient(135deg, rgba(6, 12, 6, 0.95), rgba(8, 18, 12, 0.98))',
        }}
      >
        <div className="absolute inset-0 opacity-40" style={{
          backgroundImage:
            'linear-gradient(120deg, rgba(0, 255, 153, 0.08) 0%, transparent 50%),\n' +
            'radial-gradient(circle at 70% 70%, rgba(0, 255, 102, 0.12), transparent 45%)',
        }} />
        <div className="relative z-10 mx-auto max-w-6xl px-6 py-10">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="rounded-2xl border border-emerald-400/30 bg-emerald-500/10 p-3 shadow-lg shadow-emerald-500/20">
                <Sparkles className="h-6 w-6 text-emerald-300" />
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.35em] text-emerald-300">{t('whatsNew.eyebrow', 'FO4 Release Notes')}</p>
                <h1 className="text-3xl font-black text-white">{t('whatsNew.title', "FO4 What's New in Mossy")}</h1>
                <p className="text-sm text-emerald-100/70">
                  {t('whatsNew.versionLine', 'v{version} — Fallout 4 modding updates in this release.').replace('{version}', packageJson.version)}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleBack}
              className="inline-flex items-center gap-2 rounded-full border border-emerald-400/40 bg-emerald-500/10 px-4 py-2 text-sm font-semibold text-emerald-200 transition-colors hover:bg-emerald-500/20"
            >
              <ArrowLeft className="h-4 w-4" />
              {t('whatsNew.backToMossy', 'Back to Mossy')}
            </button>
          </div>

          {fallbackInfo?.used && (() => {
            const template = t(
              'whatsNew.fallbackText',
              'Current version {requested} has no dedicated changelog section yet. Showing latest available notes from {resolved}.'
            );
            const [before, afterRequested] = template.split('{requested}');
            const [middle, after] = afterRequested.split('{resolved}');
            return (
              <div className="mt-6 rounded-2xl border border-amber-400/40 bg-amber-500/10 p-4 text-amber-100">
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-amber-300">{t('whatsNew.fallbackNotice', 'Fallback Notice')}</p>
                <p className="mt-1 text-sm">
                  {before}<strong>{fallbackInfo.requestedVersion}</strong>{middle}<strong>{fallbackInfo.resolvedVersion || t('whatsNew.unknownVersion', 'unknown version')}</strong>{after}
                </p>
              </div>
            );
          })()}

          <div className="mt-10 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
            <section className="rounded-3xl border border-emerald-500/20 bg-black/40 p-6 shadow-2xl shadow-emerald-900/30">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-emerald-200">{t('whatsNew.highlights', 'Highlights')}</h2>
                <span className="rounded-full border border-emerald-400/30 bg-emerald-500/10 px-3 py-1 text-xs uppercase tracking-[0.3em] text-emerald-200">
                  {t('whatsNew.updated', 'Updated')}
                </span>
              </div>
              <div className="mt-6 grid gap-4">
                {loading && (
                  <div className="rounded-2xl border border-emerald-500/20 bg-black/30 p-4 text-sm text-emerald-200/80">
                    {t('whatsNew.loadingChangelog', 'Loading changelog notes...')}
                  </div>
                )}
                {!loading && features.length === 0 && (
                  <div className="rounded-2xl border border-amber-400/30 bg-amber-500/10 p-4 text-sm text-amber-100">
                    {t('whatsNew.noHighlights', 'No changelog highlights are available yet for this build.')}
                  </div>
                )}
                {features.map((feature, index) => (
                  <div
                    key={index}
                    className="group flex items-start gap-4 rounded-2xl border border-emerald-500/10 bg-gradient-to-br from-emerald-500/10 via-transparent to-transparent p-4 transition-transform hover:-translate-y-1"
                  >
                    <div className="text-2xl">{feature.icon}</div>
                    <div className="flex-1">
                      <h3 className="text-base font-semibold text-white">{feature.title}</h3>
                      <p className="mt-1 text-sm text-emerald-100/70">{feature.description}</p>
                    </div>
                    <CheckCircle className="h-5 w-5 flex-shrink-0 text-emerald-300/90" />
                  </div>
                ))}
              </div>
              {!loading && highlights.length > 0 && (
                <div className="mt-6 rounded-2xl border border-emerald-500/20 bg-black/30 p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-emerald-300">{t('whatsNew.releaseHighlights', 'Release Highlights')}</p>
                  <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-emerald-100/80">
                    {highlights.map((line, index) => (
                      <li key={index}>{line}</li>
                    ))}
                  </ul>
                </div>
              )}
            </section>

            <section className="space-y-6">
              <div className="rounded-3xl border border-emerald-500/20 bg-black/50 p-6">
                <h2 className="text-lg font-semibold text-emerald-200">{t('whatsNew.workflowTips', 'FO4 Workflow Tips')}</h2>
                <ul className="mt-4 space-y-3 text-sm text-emerald-100/70">
                  <li>{t('whatsNew.tip1', 'Use the sidebar to jump quickly between FO4 hubs (CK, Plugin, Asset, Runtime, and Packaging).')}</li>
                  <li>{t('whatsNew.tip2', 'Press Ctrl+K to search routes, hubs, and tools by Fallout 4 workflow intent.')}</li>
                  <li>{t('whatsNew.tip3', 'After updates, run your normal verify loop (load order, assets, packaging) before publishing a mod build.')}</li>
                </ul>
              </div>

              <div className="rounded-3xl border border-emerald-500/20 bg-black/50 p-6">
                <h2 className="text-lg font-semibold text-emerald-200">{t('whatsNew.stayInLoop', 'Stay in the Loop')}</h2>
                <p className="mt-3 text-sm text-emerald-100/70">
                  {t('whatsNew.stayInLoopText', "We'll surface new releases here instead of layering them over your workflow. You can always revisit this page from the sidebar.")}
                </p>
                <label className="mt-4 flex items-center gap-2 text-sm text-emerald-100/80">
                  <input
                    type="checkbox"
                    checked={dontShowAgain}
                    onChange={(e) => setDontShowAgain(e.target.checked)}
                    className="h-4 w-4 rounded border-emerald-500/40 bg-black text-emerald-400 focus:ring-emerald-400"
                  />
                  {t('whatsNew.dontAutoOpen', "Don't auto-open this page again")}
                </label>
                <button
                  type="button"
                  onClick={handleBack}
                  className="mt-5 w-full rounded-2xl bg-emerald-500/80 px-4 py-2 text-sm font-semibold text-black transition-colors hover:bg-emerald-400"
                >
                  {t('whatsNew.continueToDashboard', 'Continue to Dashboard')}
                </button>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WhatsNewPage;
