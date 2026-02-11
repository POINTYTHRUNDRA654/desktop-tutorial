import React, { useMemo, useState } from 'react';
import { ArrowLeft, CheckCircle, Sparkles } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';

interface WhatsNewPageProps {
  onDismiss?: () => void;
}

const WhatsNewPage: React.FC<WhatsNewPageProps> = ({ onDismiss }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [dontShowAgain, setDontShowAgain] = useState(false);

  const features = useMemo(
    () => [
      {
        title: 'Enhanced AI Chat',
        description: 'Improved conversation memory and context awareness for better assistance.',
        icon: '🤖',
      },
      {
        title: 'Project Management',
        description: 'Create, switch, and manage multiple modding projects with ease.',
        icon: '📁',
      },
      {
        title: 'Neural Link Integration',
        description: 'Real-time monitoring of Blender, Creation Kit, and other modding tools.',
        icon: '🧠',
      },
      {
        title: 'Advanced Asset Analysis',
        description: 'Comprehensive NIF, DDS, and ESP file validation with performance warnings.',
        icon: '🔍',
      },
      {
        title: 'Global Search',
        description: 'Search across all modules and features with Ctrl+K shortcut.',
        icon: '🔎',
      },
      {
        title: 'Favorites System',
        description: 'Bookmark frequently used tools for quick access.',
        icon: '⭐',
      },
    ],
    []
  );

  const handleBack = () => {
    if (dontShowAgain) {
      localStorage.setItem('mossy_whats_new_dismissed', 'true');
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
                <p className="text-xs uppercase tracking-[0.35em] text-emerald-300">Release Notes</p>
                <h1 className="text-3xl font-black text-white">What's New in Mossy</h1>
                <p className="text-sm text-emerald-100/70">v5.4.2.1 - Mossy Overlay highlights, now on its own page.</p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleBack}
              className="inline-flex items-center gap-2 rounded-full border border-emerald-400/40 bg-emerald-500/10 px-4 py-2 text-sm font-semibold text-emerald-200 transition-colors hover:bg-emerald-500/20"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Mossy
            </button>
          </div>

          <div className="mt-10 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
            <section className="rounded-3xl border border-emerald-500/20 bg-black/40 p-6 shadow-2xl shadow-emerald-900/30">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-emerald-200">Highlights</h2>
                <span className="rounded-full border border-emerald-400/30 bg-emerald-500/10 px-3 py-1 text-xs uppercase tracking-[0.3em] text-emerald-200">
                  Updated
                </span>
              </div>
              <div className="mt-6 grid gap-4">
                {features.map((feature) => (
                  <div
                    key={feature.title}
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
            </section>

            <section className="space-y-6">
              <div className="rounded-3xl border border-emerald-500/20 bg-black/50 p-6">
                <h2 className="text-lg font-semibold text-emerald-200">Navigation Tips</h2>
                <ul className="mt-4 space-y-3 text-sm text-emerald-100/70">
                  <li>Use the sidebar to jump between tools and guides quickly.</li>
                  <li>Press Ctrl+K to open Global Search across modules.</li>
                  <li>Pin your favorite tools so they stay one click away.</li>
                </ul>
              </div>

              <div className="rounded-3xl border border-emerald-500/20 bg-black/50 p-6">
                <h2 className="text-lg font-semibold text-emerald-200">Stay in the Loop</h2>
                <p className="mt-3 text-sm text-emerald-100/70">
                  We'll surface new releases here instead of layering them over your workflow.
                  You can always revisit this page from the sidebar.
                </p>
                <label className="mt-4 flex items-center gap-2 text-sm text-emerald-100/80">
                  <input
                    type="checkbox"
                    checked={dontShowAgain}
                    onChange={(e) => setDontShowAgain(e.target.checked)}
                    className="h-4 w-4 rounded border-emerald-500/40 bg-black text-emerald-400 focus:ring-emerald-400"
                  />
                  Don't auto-open this page again
                </label>
                <button
                  type="button"
                  onClick={handleBack}
                  className="mt-5 w-full rounded-2xl bg-emerald-500/80 px-4 py-2 text-sm font-semibold text-black transition-colors hover:bg-emerald-400"
                >
                  Continue to Dashboard
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
