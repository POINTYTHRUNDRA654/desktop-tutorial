import React, { useState } from 'react';
import { ArrowDownToLine, ChevronDown, ChevronUp, Lock, Map, RotateCcw, Settings as SettingsIcon, Wifi, Wrench } from 'lucide-react';
import type { ElectronAPI } from '../../electron/types';
import PrivacySettings from './PrivacySettings';
import LanguageSettings from './LanguageSettings';
import ExternalToolsSettings from './ExternalToolsSettings';
import { SettingsImportExport } from './SettingsImportExport';
import TutorialResetSettings from './TutorialResetSettings';
import VersionInfo from './VersionInfo';

type HubSection = {
  id: string;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  content: React.ReactNode;
};

// ─── Internet Access Test panel ───────────────────────────────────────────────
type ProviderResult = {
  name: string;
  url: string;
  ok: boolean;
  result?: string;
  empty?: boolean;
  error?: string;
  ms: number;
};

type TestReport = {
  providers: ProviderResult[];
  wikiOk: boolean;
  generalOk: boolean;
  summary: string;
};

/** Max characters shown for a per-provider error message in the results table. */
const PROVIDER_ERROR_DISPLAY_LENGTH = 60;

const InternetTestPanel: React.FC = () => {
  const [running, setRunning] = useState(false);
  const [report, setReport] = useState<TestReport | null>(null);
  const [error, setError] = useState<string | null>(null);

  const runTest = async () => {
    setRunning(true);
    setReport(null);
    setError(null);
    try {
      const api: ElectronAPI | undefined = (window.electron?.api ?? (window as { electronAPI?: ElectronAPI }).electronAPI);
      if (typeof api?.testInternetAccess !== 'function') {
        setError('testInternetAccess API not available — make sure you are running inside Electron.');
        return;
      }
      const result = await api.testInternetAccess();
      setReport(result);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="space-y-4 text-sm">
      <p className="text-slate-300 text-xs">
        Probes every search provider Mossy uses (Fallout Wiki, Fandom, DuckDuckGo, Wikipedia) and
        shows which ones are reachable right now. Use this to confirm internet access is working
        before asking Mossy to go online.
      </p>

      <button
        type="button"
        onClick={runTest}
        disabled={running}
        className="flex items-center gap-2 px-4 py-2 rounded-md bg-emerald-700 hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold text-xs transition-colors"
      >
        <Wifi className={`w-4 h-4 ${running ? 'animate-pulse' : ''}`} />
        {running ? 'Testing…' : 'Test Internet Access Now'}
      </button>

      {error && (
        <div className="rounded-md border border-red-700/50 bg-red-900/20 p-3 text-xs text-red-300 font-mono">
          {error}
        </div>
      )}

      {report && (
        <div className="space-y-3">
          {/* Summary banner */}
          <div className={`rounded-md border p-3 text-xs font-semibold ${
            report.wikiOk && report.generalOk
              ? 'border-emerald-600/50 bg-emerald-900/20 text-emerald-300'
              : report.wikiOk || report.generalOk
                ? 'border-yellow-600/50 bg-yellow-900/20 text-yellow-300'
                : 'border-red-600/50 bg-red-900/20 text-red-300'
          }`}>
            {report.summary}
          </div>

          {/* Per-provider table */}
          <div className="rounded-md border border-slate-700/50 overflow-hidden">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-slate-800/60 text-slate-400 text-left">
                  <th className="px-3 py-2 font-semibold">Provider</th>
                  <th className="px-3 py-2 font-semibold">Status</th>
                  <th className="px-3 py-2 font-semibold">Time</th>
                </tr>
              </thead>
              <tbody>
                {report.providers.map((p, i) => (
                  <tr key={i} className="border-t border-slate-700/30">
                    <td className="px-3 py-2 font-mono text-slate-200">{p.name}</td>
                    <td className="px-3 py-2">
                      {p.ok ? (
                        <span className="text-emerald-400 font-semibold">✅ OK</span>
                      ) : p.empty ? (
                        <span className="text-yellow-400 font-semibold">⚠ Empty</span>
                      ) : (
                        <span className="text-red-400 font-semibold">❌ {p.error?.slice(0, PROVIDER_ERROR_DISPLAY_LENGTH)}</span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-slate-400 font-mono">{p.ms}ms</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Sample result from first successful provider */}
          {report.providers.find((p) => p.ok && p.result) && (
            <div className="rounded-md border border-slate-700/50 bg-slate-900/30 p-3">
              <div className="text-xs font-semibold text-slate-300 mb-1">
                Sample result from {report.providers.find((p) => p.ok && p.result)?.name}:
              </div>
              <div className="text-xs text-slate-400 font-mono whitespace-pre-wrap">
                {report.providers.find((p) => p.ok && p.result)?.result}
              </div>
            </div>
          )}

          {/* DNS failure help */}
          {!report.wikiOk && !report.generalOk && (
            <div className="rounded-md border border-yellow-700/30 bg-yellow-900/10 p-3 text-xs text-yellow-200 space-y-1">
              <div className="font-semibold">Troubleshooting DNS failures:</div>
              <ul className="list-disc list-inside space-y-0.5 text-yellow-300/80">
                <li>Open Command Prompt and run: <code className="font-mono bg-black/30 px-1 rounded">nslookup fallout.wiki 8.8.8.8</code></li>
                <li>Check if a firewall or VPN is blocking outbound HTTPS</li>
                <li>Allowlist: <code className="font-mono bg-black/30 px-1 rounded">fallout.wiki fallout.fandom.com api.duckduckgo.com en.wikipedia.org</code></li>
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
// ─────────────────────────────────────────────────────────────────────────────

const SettingsHub: React.FC = () => {
  const [expandedSection, setExpandedSection] = useState<string>('privacy');

  const toggleSection = (id: string) => {
    setExpandedSection((current) => (current === id ? '' : id));
  };

  const sections: HubSection[] = [
    {
      id: 'privacy',
      title: 'Step 1: Privacy & Security',
      description: 'Control data collection, sharing, and security rules.',
      icon: Lock,
      content: <PrivacySettings embedded />,
    },
    {
      id: 'language',
      title: 'Step 2: Language',
      description: 'Choose the UI language and request new translations.',
      icon: Map,
      content: <LanguageSettings embedded />,
    },
    {
      id: 'external-tools',
      title: 'Step 3: External Tools',
      description: 'Point Mossy at your modding toolchain and verify paths.',
      icon: Wrench,
      content: <ExternalToolsSettings embedded />,
    },
    {
      id: 'import-export',
      title: 'Step 4: Backup & Restore',
      description: 'Export or import settings snapshots for quick recovery.',
      icon: ArrowDownToLine,
      content: <SettingsImportExport embedded />,
    },
    {
      id: 'tutorial-reset',
      title: 'Step 5: Tutorial & Onboarding',
      description: 'Replay the installation tutorial and onboarding experience.',
      icon: RotateCcw,
      content: <TutorialResetSettings embedded />,
    },
    {
      id: 'internet-test',
      title: 'Step 6: Internet Access Test',
      description: 'Check that Mossy can reach search providers and go online.',
      icon: Wifi,
      content: <InternetTestPanel />,
    },
  ];

  return (
    <div className="min-h-full bg-[#0b0f0b] text-slate-100 p-6 md:p-10">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col gap-3 mb-8">
          <div className="text-[10px] font-mono tracking-[0.3em] text-emerald-400/70 uppercase">Mossy Core - Settings</div>
          <div className="flex items-center gap-3">
            <SettingsIcon className="w-7 h-7 text-emerald-300" />
            <h1 className="text-3xl md:text-4xl font-black tracking-tight text-white">Settings Hub (All-in-One)</h1>
          </div>
          <p className="text-sm font-medium text-slate-300 max-w-2xl">
            One ordered flow for privacy, language, external tools, and backup workflows.
          </p>
        </div>

        <div className="mb-6 rounded-lg border border-emerald-700/30 bg-emerald-900/10 p-4 text-xs font-medium text-slate-300">
          <div className="font-bold text-slate-200">Flow (Read in Order)</div>
          <ol className="list-decimal list-inside mt-2 space-y-1 text-slate-300">
            <li>Lock down privacy and security basics</li>
            <li>Choose your preferred UI language</li>
            <li>Verify external tool paths and launches</li>
            <li>Export a clean backup snapshot</li>
            <li>Replay the installation tutorial if needed</li>
          </ol>
        </div>

        <div className="space-y-4">
          {sections.map((section) => {
            const isExpanded = expandedSection === section.id;
            const Icon = section.icon;

            return (
              <div key={section.id} className="border border-slate-800 rounded-lg overflow-hidden bg-black/30">
                <button
                  type="button"
                  onClick={() => toggleSection(section.id)}
                  className="w-full px-4 py-3 flex items-center justify-between text-left bg-slate-900/50 hover:bg-slate-900/70 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Icon className="w-5 h-5 text-emerald-300" />
                    <div>
                      <div className="text-sm font-black text-white">{section.title}</div>
                      <div className="text-xs font-medium text-slate-300">{section.description}</div>
                    </div>
                  </div>
                  {isExpanded ? (
                    <ChevronUp className="w-4 h-4 text-emerald-300" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-emerald-300" />
                  )}
                </button>

                {isExpanded && (
                  <div className="p-4 bg-[#0a0e0a] border-t border-slate-800">
                    {section.content}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Version Info - Always Visible */}
        <div className="mt-8">
          <VersionInfo embedded />
        </div>
      </div>
    </div>
  );
};

export default SettingsHub;
