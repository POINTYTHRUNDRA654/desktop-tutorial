import React from 'react';
import { useNavigate } from 'react-router-dom';

export type ExternalToolLink = {
  label: string;
  href: string;
  note?: string;
  kind?: 'official' | 'search' | 'docs';
};

export type PageShortcut = {
  label: string;
  to: string;
};

export type ToolsInstallVerifyPanelProps = {
  title?: string;
  description?: string;
  tools?: ExternalToolLink[];
  verify?: string[];
  firstTestLoop?: string[];
  troubleshooting?: string[];
  shortcuts?: PageShortcut[];
  accentClassName?: string;
  className?: string;
};

const openExternal = async (url: string) => {
  const bridge = (window as any).electron?.api || (window as any).electronAPI;
  try {
    if (bridge?.openExternal) {
      await bridge.openExternal(url);
      return;
    }
  } catch {
    // ignore
  }
  window.open(url, '_blank', 'noopener,noreferrer');
};

const badgeClass = (kind: ExternalToolLink['kind']) => {
  switch (kind) {
    case 'official':
      return 'bg-emerald-500/10 text-emerald-200 border-emerald-500/30';
    case 'search':
      return 'bg-sky-500/10 text-sky-200 border-sky-500/30';
    case 'docs':
      return 'bg-amber-500/10 text-amber-200 border-amber-500/30';
    default:
      return 'bg-slate-500/10 text-slate-200 border-slate-500/30';
  }
};

const badgeText = (kind: ExternalToolLink['kind']) => {
  switch (kind) {
    case 'official':
      return 'Official';
    case 'search':
      return 'Search';
    case 'docs':
      return 'Docs';
    default:
      return 'Link';
  }
};

export const ToolsInstallVerifyPanel: React.FC<ToolsInstallVerifyPanelProps> = ({
  title = '🧰 Tools / Install / Verify (No Guesswork)',
  description,
  tools,
  verify,
  firstTestLoop,
  troubleshooting,
  shortcuts,
  accentClassName = 'text-purple-300',
  className,
}) => {
  const navigate = useNavigate();

  const hasTools = (tools ?? []).length > 0;
  const hasShortcuts = (shortcuts ?? []).length > 0;

  return (
    <div className={`bg-slate-900/60 border border-slate-700 rounded-lg p-4 mb-6 ${className ?? ''}`}>
      <div className={`text-sm font-bold mb-2 ${accentClassName}`}>{title}</div>
      {description ? <div className="text-sm text-slate-200 mb-3">{description}</div> : null}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <div className="text-xs font-bold text-slate-200 mb-2">Tools</div>
          {!hasTools ? (
            <div className="text-sm text-slate-300">No external tools required for this page.</div>
          ) : (
            <ul className="space-y-2">
              {(tools ?? []).map((t) => (
                <li key={`${t.label}:${t.href}`} className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-sm text-slate-100 font-semibold truncate">{t.label}</div>
                    {t.note ? <div className="text-xs text-slate-400">{t.note}</div> : null}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`text-[10px] px-2 py-0.5 rounded border ${badgeClass(t.kind)}`}>{badgeText(t.kind)}</span>
                    <button
                      type="button"
                      onClick={() => void openExternal(t.href)}
                      className="px-2 py-1 text-xs rounded bg-slate-800 hover:bg-slate-700 border border-slate-600 text-slate-100"
                      title={t.href}
                    >
                      Open
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div>
          <div className="text-xs font-bold text-slate-200 mb-2">Verify (quick)</div>
          {(verify ?? []).length ? (
            <ul className="list-disc ml-5 text-sm text-slate-300 space-y-1">
              {(verify ?? []).map((s) => (
                <li key={s}>{s}</li>
              ))}
            </ul>
          ) : (
            <div className="text-sm text-slate-300">Open the page and confirm it renders without errors.</div>
          )}

          {(firstTestLoop ?? []).length ? (
            <>
              <div className="text-xs font-bold text-slate-200 mt-3 mb-2">First test loop</div>
              <ul className="list-disc ml-5 text-sm text-slate-300 space-y-1">
                {(firstTestLoop ?? []).map((s) => (
                  <li key={s}>{s}</li>
                ))}
              </ul>
            </>
          ) : null}

          {(troubleshooting ?? []).length ? (
            <>
              <div className="text-xs font-bold text-slate-200 mt-3 mb-2">Troubleshooting</div>
              <ul className="list-disc ml-5 text-sm text-slate-300 space-y-1">
                {(troubleshooting ?? []).map((s) => (
                  <li key={s}>{s}</li>
                ))}
              </ul>
            </>
          ) : null}

          {hasShortcuts ? (
            <>
              <div className="text-xs font-bold text-slate-200 mt-3 mb-2">In-app shortcuts</div>
              <div className="flex flex-wrap gap-2">
                {(shortcuts ?? []).map((s) => (
                  <button
                    key={`${s.label}:${s.to}`}
                    type="button"
                    onClick={() => navigate(s.to)}
                    className="px-3 py-1 text-xs rounded bg-slate-800 hover:bg-slate-700 border border-slate-600 text-slate-100"
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
};
