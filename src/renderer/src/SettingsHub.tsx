import React, { useState, useEffect } from 'react';
import { ArrowDownToLine, ChevronDown, ChevronUp, Heart, Lock, Map, RotateCcw, Settings as SettingsIcon, Wifi, Wrench, Check, Brain, Zap } from 'lucide-react';
import type { ElectronAPI } from '../../electron/types';
import PrivacySettings from './PrivacySettings';
import LanguageSettings from './LanguageSettings';
import ExternalToolsSettings from './ExternalToolsSettings';
import AIEngineSettings from './AIEngineSettings';
import OllamaSettings from './OllamaSettings';
import { SettingsImportExport } from './SettingsImportExport';
import TutorialResetSettings from './TutorialResetSettings';
import VersionInfo from './VersionInfo';
import { CreditsPanel } from './CreditsPanel';

// ─── Credits Section ───────────────────────────────────────────────────────────

const CredsSection: React.FC = () => {
  const [showCreditPanel, setShowCreditPanel] = useState(false);

  return (
    <div className="space-y-4 text-sm">
      <div className="p-3 rounded-md border border-emerald-700/30 bg-emerald-900/10 text-emerald-200 text-xs">
        <div className="font-semibold mb-1">❤️ Built with Love on Amazing Open-Source Software</div>
        <p>
          Mossy stands on the shoulders of giants. Every feature you use is powered by
          dedicated developers and vibrant communities. Click below to see the full searchable
          credits, licenses, and attributions for all tools and frameworks.
        </p>
      </div>

      <button
        type="button"
        onClick={() => setShowCreditPanel(true)}
        className="flex items-center gap-2 px-4 py-2 rounded-md bg-rose-700 hover:bg-rose-600 text-white font-semibold text-xs transition-colors"
      >
        <Heart className="w-4 h-4" />
        View Full Credits &amp; Licenses
      </button>

      {showCreditPanel && (
        <CreditsPanel onClose={() => setShowCreditPanel(false)} />
      )}

      {/* Quick-reference list of major tools */}
      <div className="rounded-md border border-slate-700 bg-slate-800/30 p-4 space-y-3 text-xs">
        <div>
          <h4 className="font-semibold text-slate-200 mb-2">📦 Core Framework</h4>
          <ul className="space-y-1 text-slate-300">
            <li>• <strong>Electron</strong> - Cross-platform desktop framework (MIT)</li>
            <li>• <strong>React</strong> - UI library by Meta (MIT)</li>
            <li>• <strong>TypeScript</strong> - Typed JavaScript by Microsoft (Apache 2.0)</li>
            <li>• <strong>Vite</strong> - Next-gen build tool (MIT)</li>
          </ul>
        </div>

        <div>
          <h4 className="font-semibold text-slate-200 mb-2">🤖 AI & Machine Learning</h4>
          <ul className="space-y-1 text-slate-300">
            <li>• <strong>OpenAI SDK</strong> - ChatGPT integration (Apache 2.0)</li>
            <li>• <strong>Groq SDK</strong> - Fast LLM inference (Apache 2.0)</li>
            <li>• <strong>PyTorch</strong> - ML framework by Meta (BSD)</li>
            <li>• <strong>NumPy</strong> - Numerical computing (BSD 3-Clause)</li>
            <li>• <strong>Krea AI Suite</strong> - AI image, video &amp; 3D generation (Commercial / krea.ai)</li>
          </ul>
        </div>

        <div>
          <h4 className="font-semibold text-slate-200 mb-2">🎨 UI & Design</h4>
          <ul className="space-y-1 text-slate-300">
            <li>• <strong>TailwindCSS</strong> - Utility-first CSS (MIT)</li>
            <li>• <strong>Lucide Icons</strong> - Icon library (ISC)</li>
            <li>• <strong>react-markdown</strong> - Markdown renderer (MIT)</li>
            <li>• <strong>Recharts</strong> - Charts library (MIT)</li>
          </ul>
        </div>

        <div>
          <h4 className="font-semibold text-slate-200 mb-2">🎮 Modding Tools (separate downloads)</h4>
          <ul className="space-y-1 text-slate-300">
            <li>• <strong>Blender</strong> - 3D modeling (GPL 2.0)</li>
            <li>• <strong>PyNifly</strong> - NIF import/export for Blender by BadDogSkyrim (MIT)</li>
            <li>• <strong>xEdit / FO4Edit</strong> - Plugin editor by ElminsterAU (GPL 2.0)</li>
            <li>• <strong>Creation Kit</strong> - Official Bethesda modding tool</li>
            <li>• <strong>NifSkope</strong> - NIF mesh &amp; texture viewer by hexabits (GPL 3.0)</li>
            <li>• <strong>Mod Organizer 2</strong> - Mod manager by Tannin42 / MO2 Team (GPL 3.0)</li>
            <li>• <strong>Vortex</strong> - Mod manager by Nexus Mods</li>
            <li>• <strong>F4SE</strong> - Fallout 4 Script Extender by ianpatt &amp; behippo</li>
            <li>• <strong>LOOT</strong> - Load Order Optimisation Tool (GPL 3.0)</li>
            <li>• <strong>BodySlide &amp; Outfit Studio</strong> - Body morphing by ousnius &amp; Caliente (MIT)</li>
            <li>• <strong>B.A.E.</strong> - Bethesda Archive Extractor by jonwd7</li>
            <li>• <strong>GIMP</strong> - GNU Image Manipulation Program (GPL 3.0)</li>
            <li>• <strong>UModel (UEViewer)</strong> - Unreal Engine asset viewer by Gildor</li>
          </ul>
        </div>

        <div className="pt-2 border-t border-slate-700">
          <p className="text-slate-400">
            …and 100+ more dependencies. Click <strong>View Full Credits &amp; Licenses</strong> above for the
            complete searchable list with version numbers and license links.
          </p>
        </div>
      </div>

      <div className="p-3 rounded-md border border-blue-700/30 bg-blue-900/10 text-blue-200 text-xs space-y-2">
        <div className="font-semibold">📋 License Compliance</div>
        <p>
          Mossy respects all open-source licenses. Our LICENSE and CREDITS.md files are included
          in your installation folder and this app bundle for transparency and attribution.
        </p>
        <p className="text-blue-300">
          Found a license issue?{' '}
          <a
            href="https://github.com/POINTYTHRUNDRA654/mossy-ai/issues/new?title=License%20Compliance%20Issue"
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-blue-200"
          >
            Report it on GitHub
          </a>
        </p>
      </div>
    </div>
  );
};


type HubSection = {
  id: string;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  content: React.ReactNode;
};

// ─── Utility Hook for Tracking Activated Settings Buttons ───────────────────

export const useSettingsActivation = () => {
  const readActivatedButtons = (): string[] => {
    try {
      const raw = localStorage.getItem('mossy_settings_activated_buttons');
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  };

  const markActivated = (buttonId: string) => {
    const activated = new Set(readActivatedButtons());
    activated.add(buttonId);
    localStorage.setItem('mossy_settings_activated_buttons', JSON.stringify(Array.from(activated)));
    // Dispatch custom event to notify UI updates
    window.dispatchEvent(new CustomEvent('settings-button-activated', { detail: { buttonId } }));
  };

  const isActivated = (buttonId: string) => {
    const activated = new Set(readActivatedButtons());
    return activated.has(buttonId);
  };

  return { markActivated, isActivated };
};

// ─── Custom Button Wrapper for Settings ───────────────────────────────────────
/**
 * Uses this wrapper in child settings components like:
 * &lt;SettingsButton id="test-internet-access" onClick={() => { runTest(); }}&gt;
 *   Test Internet
 * &lt;/SettingsButton&gt;
 */
export const SettingsButton: React.FC<{
  id: string;
  children: React.ReactNode;
  onClick: () => void | Promise<void>;
  className?: string;
  disabled?: boolean;
  variant?: 'primary' | 'secondary';
}> = ({ id, children, onClick, className = '', disabled, variant = 'primary' }) => {
  const [isActivated, setIsActivated] = useState(false);
  const { markActivated, isActivated: checkActivated } = useSettingsActivation();

  useEffect(() => {
    setIsActivated(checkActivated(id));
    const handleActivated = (e: CustomEvent) => {
      if (e.detail.buttonId === id) setIsActivated(true);
    };
    window.addEventListener('settings-button-activated', handleActivated as EventListener);
    return () => window.removeEventListener('settings-button-activated', handleActivated as EventListener);
  }, [id, checkActivated]);

  const handleClick = async () => {
    await onClick();
    markActivated(id);
    setIsActivated(true);
  };

  const baseClass = variant === 'primary'
    ? 'bg-emerald-700 hover:bg-emerald-600 text-white'
    : 'bg-slate-700 hover:bg-slate-600 text-white';

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={disabled}
      className={`flex items-center gap-2 px-4 py-2 rounded-md ${baseClass} font-semibold text-xs transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${className} ${isActivated ? 'ring-2 ring-emerald-400 ring-offset-1 ring-offset-slate-900' : ''
        }`}
    >
      {children}
      {isActivated && <Check className="w-4 h-4 ml-auto" />}
    </button>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
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
      const api: ElectronAPI | undefined = (window.electron?.api ?? (window as unknown as { electronAPI?: ElectronAPI }).electronAPI);
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

      <SettingsButton
        id="test-internet-access"
        onClick={runTest}
        disabled={running}
        variant="primary"
      >
        <Wifi className={`w-4 h-4 ${running ? 'animate-pulse' : ''}`} />
        {running ? 'Testing…' : 'Test Internet Access Now'}
      </SettingsButton>

      {error && (
        <div className="rounded-md border border-red-700/50 bg-red-900/20 p-3 text-xs text-red-300 font-mono">
          {error}
        </div>
      )}

      {report && (
        <div className="space-y-3">
          {/* Summary banner */}
          <div className={`rounded-md border p-3 text-xs font-semibold ${report.wikiOk && report.generalOk
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
      id: 'ai-engine',
      title: 'Step 3: AI Engine',
      description: 'Choose the Groq model, response length, and self-critique mode.',
      icon: Brain,
      content: <AIEngineSettings embedded />,
    },
    {
      id: 'ollama',
      title: 'Step 3b: Local LLM (Ollama - Optional)',
      description: 'Run open-source models locally for offline AI assistance.',
      icon: Zap,
      content: <OllamaSettings embedded />,
    },
    {
      id: 'external-tools',
      title: 'Step 4: External Tools',
      description: 'Point Mossy at your modding toolchain and verify paths.',
      icon: Wrench,
      content: <ExternalToolsSettings embedded />,
    },
    {
      id: 'import-export',
      title: 'Step 5: Backup & Restore',
      description: 'Export or import settings snapshots for quick recovery.',
      icon: ArrowDownToLine,
      content: <SettingsImportExport embedded />,
    },
    {
      id: 'tutorial-reset',
      title: 'Step 6: Tutorial & Onboarding',
      description: 'Replay the installation tutorial and onboarding experience.',
      icon: RotateCcw,
      content: <TutorialResetSettings embedded />,
    },
    {
      id: 'internet-test',
      title: 'Step 7: Internet Access Test',
      description: 'Check that Mossy can reach search providers and go online.',
      icon: Wifi,
      content: <InternetTestPanel />,
    },
    {
      id: 'credits',
      title: 'Credits & Acknowledgments',
      description: 'View the incredible open-source projects that power Mossy.',
      icon: Heart,
      content: <CredsSection />,
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
            <li>Configure the AI engine (model, response length, self-critique)</li>
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
