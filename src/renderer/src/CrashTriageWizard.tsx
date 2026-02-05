import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AlertCircle, Bug, CheckCircle2, ExternalLink, Send, ShieldCheck, Wrench } from 'lucide-react';
import { ToolsInstallVerifyPanel } from './components/ToolsInstallVerifyPanel';

type SectionId = 'collect' | 'repro' | 'logs' | 'isolate' | 'fix' | 'verify';

type Step = { id: string; title: string; details: React.ReactNode };

type Section = {
  id: SectionId;
  title: string;
  icon: React.ComponentType<any>;
  steps: Step[];
};

type State = {
  checked: Record<string, boolean>; // `${sectionId}:${stepId}`
  scenario: 'ctd_launch' | 'ctd_ingame' | 'infinite_load' | 'broken_save' | 'weird_bug';
};

const STORAGE_KEY = 'mossy_crash_triage_state_v1';
const CHAT_PREFILL_KEY = 'mossy_chat_prefill_v1';

const DEFAULT_STATE: State = {
  checked: {},
  scenario: 'ctd_launch',
};

const safeParse = <T,>(raw: string | null, fallback: T): T => {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
};

const uniq = (xs: string[]) => {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const x of xs) {
    const k = x.trim();
    if (!k || seen.has(k)) continue;
    seen.add(k);
    out.push(k);
  }
  return out;
};

const openUrl = async (url: string) => {
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

const StepRow: React.FC<{
  checked: boolean;
  onToggle: () => void;
  title: string;
  children: React.ReactNode;
}> = ({ checked, onToggle, title, children }) => (
  <div className="rounded-lg border border-slate-800 bg-black/40 p-4">
    <div className="flex items-start gap-3">
      <button
        type="button"
        onClick={onToggle}
        className={`mt-0.5 h-5 w-5 rounded border flex items-center justify-center transition-colors ${checked ? 'bg-emerald-600 border-emerald-500' : 'bg-slate-900 border-slate-700 hover:border-slate-500'}`}
        aria-label={checked ? 'Mark step incomplete' : 'Mark step complete'}
        title={checked ? 'Completed' : 'Not completed'}
      >
        {checked ? <CheckCircle2 className="w-4 h-4 text-white" /> : null}
      </button>
      <div className="min-w-0 flex-1">
        <div className="text-sm font-black text-white tracking-tight">{title}</div>
        <div className="mt-2 text-xs text-slate-300 leading-relaxed">{children}</div>
      </div>
    </div>
  </div>
);

export const CrashTriageWizard: React.FC = () => {
  const navigate = useNavigate();
  const [state, setState] = useState<State>(() => safeParse(localStorage.getItem(STORAGE_KEY), DEFAULT_STATE));

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  const toggle = (sectionId: string, stepId: string) => {
    const key = `${sectionId}:${stepId}`;
    setState((s) => ({ ...s, checked: { ...s.checked, [key]: !s.checked[key] } }));
  };

  const isChecked = (sectionId: string, stepId: string) => {
    const key = `${sectionId}:${stepId}`;
    return !!state.checked[key];
  };

  const links = useMemo(() => {
    // Use searches instead of brittle direct URLs.
    return uniq([
      'https://www.nexusmods.com/fallout4/search/?gsearch=Buffout%204&gsearchtype=mods',
      'https://www.nexusmods.com/fallout4/search/?gsearch=FO4Edit&gsearchtype=mods',
      'https://www.nexusmods.com/fallout4/search/?gsearch=F4SE&gsearchtype=mods',
      'https://www.nexusmods.com/fallout4/search/?gsearch=Address%20Library&gsearchtype=mods',
    ]);
  }, []);

  const sections: Section[] = useMemo(() => {
    return [
      {
        id: 'collect',
        title: 'Collect Basics',
        icon: ShieldCheck,
        steps: [
          {
            id: 'what-happened',
            title: 'Write down exactly what fails',
            details: (
              <>
                Include: what you clicked, what you expected, what happened instead. Note whether it happens in a new game or only a specific save.

            <ToolsInstallVerifyPanel
              accentClassName="text-emerald-300"
              description="This wizard focuses on reproducibility and isolation. External tools are optional but often required for actionable crash data (Buffout/F4SE/FO4Edit)."
              tools={[
                { label: 'Nexus search: Buffout 4', href: 'https://www.nexusmods.com/fallout4/search/?gsearch=Buffout%204&gsearchtype=mods', kind: 'search' },
                { label: 'Nexus search: F4SE', href: 'https://www.nexusmods.com/fallout4/search/?gsearch=F4SE&gsearchtype=mods', kind: 'search' },
                { label: 'Nexus search: Address Library', href: 'https://www.nexusmods.com/fallout4/search/?gsearch=Address%20Library&gsearchtype=mods', kind: 'search' },
                { label: 'Nexus search: FO4Edit', href: 'https://www.nexusmods.com/fallout4/search/?gsearch=FO4Edit&gsearchtype=mods', kind: 'search' },
              ]}
              verify={[
                'Pick a scenario (CTD / infinite load / broken save) and confirm steps update appropriately.',
                'Check off 2–3 steps and refresh; confirm progress persists.',
                'Click “Send to Chat” and confirm the generated summary appears in Chat.'
              ]}
              firstTestLoop={[
                'Reproduce the failure once (same save, same location, same action).',
                'Collect logs, then disable half your mods to bisect and re-test.',
                'When you have a minimal repro, send it to Chat for a targeted plan.'
              ]}
              troubleshooting={[
                'If you cannot reproduce the issue consistently, stop changing multiple variables at once.',
                'If you are missing logs/tools, use Install Wizard + Tool Settings to set up only what you need.'
              ]}
              shortcuts={[
                { label: 'Platforms Hub', to: '/platforms' },
                { label: 'Install Wizard', to: '/install-wizard' },
                { label: 'Tool Settings', to: '/settings/tools' },
                { label: 'Diagnostics', to: '/diagnostics' },
              ]}
            />
              </>
            ),
          },
          {
            id: 'setup',
            title: 'Record your setup',
            details: (
              <>
                Mod manager (MO2/Vortex), FO4 version, and the last 3 things you changed (installed mod, updated mod, changed INI, changed load order).
              </>
            ),
          },
        ],
      },
      {
        id: 'repro',
        title: 'Reproduce Safely',
        icon: Bug,
        steps: [
          {
            id: 'clean-profile',
            title: 'Try a clean profile',
            details: (
              <>
                Use a separate profile (MO2) or separate mod set (Vortex). Goal: confirm whether the issue is your base game, your mod set, or a specific mod.
              </>
            ),
          },
          {
            id: 'binary-search',
            title: 'Do a binary search on mods',
            details: (
              <>
                Disable half the mods, test, then narrow down. This is the fastest way to find one bad mod or one bad interaction.
              </>
            ),
          },
        ],
      },
      {
        id: 'logs',
        title: 'Get Logs',
        icon: Wrench,
        steps: [
          {
            id: 'enable-logging',
            title: 'Enable crash logging tools (recommended)',
            details: (
              <>
                If you don’t have crash logs yet, install a crash logger and its dependencies. Use the links panel on this page. After install, reproduce the crash once.
              </>
            ),
          },
          {
            id: 'collect-logs',
            title: 'Collect the exact log files',
            details: (
              <>
                Keep: crash log, Papyrus log (if relevant), and your plugin list / load order. If you are not sure where they are, ask Mossy and mention your mod manager.
              </>
            ),
          },
        ],
      },
      {
        id: 'isolate',
        title: 'Isolate Root Cause',
        icon: AlertCircle,
        steps: [
          {
            id: 'one-variable',
            title: 'Change one variable at a time',
            details: (
              <>
                Don’t change 5 mods at once. One change → test → record result. This prevents false conclusions.
              </>
            ),
          },
          {
            id: 'check-masters',
            title: 'Check for missing masters / bad plugins',
            details: (
              <>
                Missing master = immediate crash risk. Use your mod manager warnings and xEdit error checks.
              </>
            ),
          },
        ],
      },
      {
        id: 'fix',
        title: 'Fix Patterns',
        icon: ShieldCheck,
        steps: [
          {
            id: 'rollback',
            title: 'Rollback the last change',
            details: (
              <>
                If the crash started after an update, rollback that mod first. Confirm the crash disappears before attempting deeper changes.
              </>
            ),
          },
          {
            id: 'patch',
            title: 'Patch conflicts (if needed)',
            details: (
              <>
                If two mods edit the same records, create a compatibility patch in xEdit. Use <Link className="text-blue-400 hover:underline" to="/install-wizard">Install Wizard</Link> for patching basics.
              </>
            ),
          },
        ],
      },
      {
        id: 'verify',
        title: 'Verify the Fix',
        icon: CheckCircle2,
        steps: [
          {
            id: 'repeat-test',
            title: 'Repeat the same reproduction steps',
            details: (
              <>
                Use the same save / same location / same action that caused the crash. If it’s fixed, repeat 2–3 times to be sure.
              </>
            ),
          },
          {
            id: 'document',
            title: 'Document what fixed it',
            details: (
              <>
                Write a short “root cause + fix” note. This becomes your personal knowledge base and makes future debugging much faster.
              </>
            ),
          },
        ],
      },
    ];
  }, []);

  const buildChatPrefill = () => {
    const scenarioLabel =
      state.scenario === 'ctd_launch'
        ? 'CTD on launch'
        : state.scenario === 'ctd_ingame'
        ? 'CTD in-game'
        : state.scenario === 'infinite_load'
        ? 'Infinite loading'
        : state.scenario === 'broken_save'
        ? 'Broken save'
        : 'Weird bug';

    const lines: string[] = [];
    lines.push("I'm using Mossy's Crash & Bug Triage Wizard. Please guide me step-by-step.");
    lines.push(`Scenario: ${scenarioLabel}`);
    lines.push('');
    lines.push('Checklist progress:');
    for (const section of sections) {
      lines.push(`\n${section.title}:`);
      for (const step of section.steps) {
        const done = isChecked(section.id, step.id);
        lines.push(`- [${done ? 'x' : ' '}] ${step.title}`);
      }
    }
    lines.push('\nWhat I want from you:');
    lines.push('1) Tell me the next 3 unchecked steps to do, in order.');
    lines.push('2) Ask for the minimum info needed (no guessing).');
    lines.push('3) End with clear verification steps.');
    return lines.join('\n');
  };

  const sendToChat = async () => {
    const draft = buildChatPrefill();
    try {
      await navigator.clipboard?.writeText(draft);
    } catch {
      // ignore
    }
    try {
      localStorage.setItem(CHAT_PREFILL_KEY, draft);
    } catch {
      // ignore
    }
    navigate('/chat', { state: { prefill: draft, from: 'crash-triage' } });
  };

  return (
    <div className="min-h-full p-6 md:p-10 bg-[#0a0e0a] text-slate-100">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-8">
          <div>
            <div className="text-[10px] font-mono tracking-[0.3em] text-emerald-400/70 uppercase">Mossy Tutor • Crash Triage</div>
            <h1 className="text-3xl md:text-4xl font-black tracking-tight text-white mt-2">Crash & Bug Triage</h1>
            <p className="text-sm text-slate-400 mt-2 max-w-2xl">
              A repeatable, verification-first workflow for diagnosing crashes and hard bugs. This wizard avoids “try random fixes” and helps you isolate the real cause.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Link
              to="/platforms"
              className="px-3 py-2 text-xs font-bold rounded-lg bg-slate-900 border border-slate-800 hover:border-slate-600 transition-colors"
              title="Back to Platforms"
            >
              Platforms
            </Link>
            <button
              type="button"
              onClick={sendToChat}
              className="inline-flex items-center gap-2 px-3 py-2 text-xs font-bold rounded-lg bg-emerald-900/20 border border-emerald-500/30 text-emerald-100 hover:bg-emerald-900/30 transition-colors"
              title="Send this checklist to Chat"
            >
              <Send className="w-4 h-4" />
              Send to Chat
            </button>
            <button
              type="button"
              onClick={() => {
                localStorage.removeItem(STORAGE_KEY);
                setState(DEFAULT_STATE);
              }}
              className="px-3 py-2 text-xs font-bold rounded-lg bg-red-900/20 border border-red-500/30 text-red-200 hover:bg-red-900/30 transition-colors"
              title="Reset wizard progress"
            >
              Reset
            </button>
          </div>
        </div>

        <div className="rounded-xl border border-slate-800 bg-black/40 p-5 mb-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="text-xs font-black tracking-widest uppercase text-slate-400">Scenario</div>
              <div className="text-[11px] text-slate-400 mt-1">Pick the closest match. Mossy will tailor questions and steps.</div>
            </div>
            <div className="flex gap-2 flex-wrap justify-end">
              {([
                { id: 'ctd_launch' as const, label: 'CTD Launch' },
                { id: 'ctd_ingame' as const, label: 'CTD In-game' },
                { id: 'infinite_load' as const, label: 'Infinite Load' },
                { id: 'broken_save' as const, label: 'Broken Save' },
                { id: 'weird_bug' as const, label: 'Weird Bug' },
              ]).map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setState((p) => ({ ...p, scenario: s.id }))}
                  className={`px-3 py-2 rounded-lg border text-[11px] font-black transition-colors ${
                    state.scenario === s.id
                      ? 'bg-blue-900/30 border-blue-500/40 text-blue-200'
                      : 'bg-slate-900/40 border-slate-800 text-slate-300 hover:border-slate-600'
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-slate-800 bg-black/40 p-5 mb-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="text-xs font-black tracking-widest uppercase text-slate-400">Downloads & Sources</div>
              <div className="text-[11px] text-slate-400 mt-1">These are safe starting points. Prefer official/upstream links when available.</div>
            </div>
            <button
              type="button"
              onClick={() => openUrl('https://www.nexusmods.com/fallout4')}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-900/40 border border-slate-800 text-xs font-bold text-slate-200 hover:border-slate-600 transition-colors"
              title="Open Nexus Fallout 4"
            >
              <ExternalLink className="w-4 h-4" />
              Open Nexus
            </button>
          </div>
          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
            {links.map((url) => (
              <button
                key={url}
                type="button"
                onClick={() => openUrl(url)}
                className="text-left rounded-lg border border-slate-800 bg-slate-900/20 hover:border-slate-600 p-3 transition-colors"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-xs font-black text-white truncate">Nexus search</div>
                    <div className="text-[10px] text-slate-500 truncate">{url}</div>
                  </div>
                  <ExternalLink className="w-4 h-4 text-slate-400" />
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-6">
          {sections.map((section) => (
            <div key={section.id} className="rounded-xl border border-slate-800 bg-black/40 p-5">
              <div className="flex items-center gap-3 mb-4">
                <section.icon className="w-5 h-5 text-emerald-300" />
                <div className="text-sm font-black text-white tracking-tight">{section.title}</div>
              </div>
              <div className="space-y-3">
                {section.steps.map((step) => (
                  <StepRow
                    key={step.id}
                    checked={isChecked(section.id, step.id)}
                    onToggle={() => toggle(section.id, step.id)}
                    title={step.title}
                  >
                    {step.details}
                  </StepRow>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-8 text-[11px] text-slate-500">
          If you want Mossy to help faster: export your Diagnostics report from <Link className="text-blue-400 hover:underline" to="/diagnostics">Diagnostic Tools</Link>.
        </div>
      </div>
    </div>
  );
};

export default CrashTriageWizard;
