import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertCircle, Bug, CheckCircle2, ExternalLink, ShieldCheck, Wrench, RefreshCw } from 'lucide-react';
import { ToolsInstallVerifyPanel } from './components/ToolsInstallVerifyPanel';
import { openExternal } from './utils/openExternal';

type SectionId = 'collect' | 'repro' | 'logs' | 'isolate' | 'fix' | 'verify';

type Step = { id: string; title: string; details: React.ReactNode };

type Section = {
  id: SectionId;
  title: string;
  icon: React.ComponentType<any>;
  steps: Step[];
};

type Scenario = 'ctd_launch' | 'ctd_ingame' | 'infinite_load' | 'broken_save' | 'weird_bug';

type State = {
  checked: Record<string, boolean>;
  scenario: Scenario;
};

const STORAGE_KEY = 'mossy_crash_triage_state_v1';

const DEFAULT_STATE: State = {
  checked: {},
  scenario: 'ctd_launch',
};

const SCENARIO_LABELS: Record<Scenario, string> = {
  ctd_launch: 'CTD on Launch',
  ctd_ingame: 'CTD In-Game',
  infinite_load: 'Infinite Load Screen',
  broken_save: 'Broken / Corrupt Save',
  weird_bug: 'Weird Visual / Logic Bug',
};

const SCENARIO_TIPS: Record<Scenario, string> = {
  ctd_launch: 'Game crashes before main menu. Most often caused by missing masters, corrupt BA2, or F4SE version mismatch.',
  ctd_ingame: 'Game crashes during play. Narrow down: specific cell, action, or NPC? Start with a save in a vanilla area.',
  infinite_load: 'Load screen never finishes. Disable navmesh patches and run xEdit to check for missing masters.',
  broken_save: 'Save loads to a broken state. Script lag from missing mods is the #1 cause. Identify removed mods via Fallrim Tools.',
  weird_bug: 'Unexpected visual or gameplay behaviour. Check precombines, precache, and mesh override conflicts.',
};

const safeParse = <T,>(raw: string | null, fallback: T): T => {
  if (!raw) return fallback;
  try { return JSON.parse(raw) as T; }
  catch { return fallback; }
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

const openUrl = (url: string) => { void openExternal(url); };

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
        className={`mt-0.5 h-5 w-5 rounded border flex items-center justify-center transition-colors shrink-0 ${checked ? 'bg-emerald-600 border-emerald-500' : 'bg-slate-900 border-slate-700 hover:border-slate-500'}`}
        aria-label={checked ? 'Mark step incomplete' : 'Mark step complete'}
        title={checked ? 'Completed' : 'Not completed'}
      >
        {checked ? <CheckCircle2 className="w-4 h-4 text-white" /> : null}
      </button>
      <div className="min-w-0 flex-1">
        <div className={`text-sm font-black tracking-tight transition-colors ${checked ? 'text-emerald-300 line-through opacity-70' : 'text-white'}`}>{title}</div>
        <div className="mt-2 text-xs text-slate-300 leading-relaxed">{children}</div>
      </div>
    </div>
  </div>
);

type CrashTriageWizardProps = {
  embedded?: boolean;
};

export const CrashTriageWizard: React.FC<CrashTriageWizardProps> = ({ embedded = false }) => {
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

  const links = useMemo(() => uniq([
    'https://www.nexusmods.com/fallout4/mods/84214',
    'https://www.nexusmods.com/fallout4/search/?gsearch=FO4Edit&gsearchtype=mods',
    'https://www.nexusmods.com/fallout4/search/?gsearch=F4SE&gsearchtype=mods',
    'https://www.nexusmods.com/fallout4/search/?gsearch=Address%20Library&gsearchtype=mods',
  ]), []);

  const sections: Section[] = useMemo(() => {
    const isCTD = state.scenario === 'ctd_launch' || state.scenario === 'ctd_ingame';
    const isLoad = state.scenario === 'infinite_load';
    const isSave = state.scenario === 'broken_save';

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
                {isCTD && <p className="mt-2 text-amber-200 font-semibold">CTD tip: note the exact point of crash — main menu, loading screen, or during gameplay.</p>}
                {isLoad && <p className="mt-2 text-amber-200 font-semibold">Infinite load tip: does it happen on all saves or just one? New game too?</p>}
                {isSave && <p className="mt-2 text-amber-200 font-semibold">Broken save tip: use Fallrim Tools / ReSaver to check for missing script instances before anything else.</p>}
                <ToolsInstallVerifyPanel
                  accentClassName="text-emerald-300"
                  description="This wizard focuses on reproducibility and isolation. External tools are optional but often required for actionable crash data (Addictol/F4SE/FO4Edit)."
                  tools={[
                    { label: 'Nexus: Addictol #84214', href: 'https://www.nexusmods.com/fallout4/mods/84214', kind: 'search' },
                    { label: 'Nexus search: F4SE', href: 'https://www.nexusmods.com/fallout4/search/?gsearch=F4SE&gsearchtype=mods', kind: 'search' },
                    { label: 'Nexus search: Address Library', href: 'https://www.nexusmods.com/fallout4/search/?gsearch=Address%20Library&gsearchtype=mods', kind: 'search' },
                    { label: 'Nexus search: FO4Edit', href: 'https://www.nexusmods.com/fallout4/search/?gsearch=FO4Edit&gsearchtype=mods', kind: 'search' },
                  ]}
                  verify={[
                    'Pick a scenario (CTD / infinite load / broken save) and confirm steps update appropriately.',
                    'Check off 2-3 steps and refresh; confirm progress persists.',
                    'Copy your checklist summary and confirm it matches your current selections.'
                  ]}
                  firstTestLoop={[
                    'Reproduce the failure once (same save, same location, same action).',
                    'Collect logs, then disable half your mods to bisect and re-test.',
                    'When you have a minimal repro, write it down as a short checklist.'
                  ]}
                  troubleshooting={[
                    'If you cannot reproduce the issue consistently, stop changing multiple variables at once.',
                    'If you are missing logs/tools, install only what you need before continuing.'
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
                {isCTD && <p className="mt-2 text-slate-400">Check your F4SE version matches your FO4 build — mismatches cause instant CTD on launch.</p>}
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
                {isSave && <p className="mt-2 text-slate-400">For broken saves: test with a fresh NEW game first to confirm the save file itself is corrupt, not the mod list.</p>}
              </>
            ),
          },
          {
            id: 'binary-search',
            title: 'Do a binary search on mods',
            details: (
              <>
                Disable half the mods, test, then narrow down. This is the fastest way to find one bad mod or one bad interaction.
                {isLoad && <p className="mt-2 text-slate-400">Infinite load is often caused by navmesh or precombine conflicts — disable relevant overhauls first.</p>}
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
            title: 'Enable crash logging tools',
            details: (
              <>
                If you don't have crash logs yet, install a crash logger (Buffout 4 or Crash Log Auto Scanner) and its dependencies (Address Library, F4SE). After install, reproduce the crash once.
                {isCTD && <p className="mt-2 text-amber-200 font-semibold">Without a crash log, you are guessing. This step is critical for CTDs.</p>}
              </>
            ),
          },
          {
            id: 'collect-logs',
            title: 'Collect the exact log files',
            details: (
              <>
                Keep: crash log (<code className="text-amber-300">Documents/My Games/Fallout4/F4SE/</code>), Papyrus log (if relevant), and your plugin list / load order. If you are not sure where they are, ask Mossy and mention your mod manager.
                {isSave && <p className="mt-2 text-slate-400">For broken saves: export your load order from your mod manager before making any changes.</p>}
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
                Don't change 5 mods at once. One change, then test, then record result. This prevents false conclusions and wasted time.
              </>
            ),
          },
          {
            id: 'check-masters',
            title: 'Check for missing masters and plugin errors',
            details: (
              <>
                Missing master = immediate crash risk. Use your mod manager's warnings and run xEdit error checks (<code className="text-amber-300">Ctrl+F3</code> after selecting all). Also check for ITMs and UDRs.
              </>
            ),
          },
          {
            id: 'check-precombines',
            title: state.scenario === 'infinite_load' || state.scenario === 'weird_bug' ? 'Check precombine and precache conflicts' : 'Check cell and worldspace overrides',
            details: (
              <>
                {isLoad && 'Broken precombines are a top cause of infinite load screens. Disable any mods that touch the Boston area worldspace cell overrides and retest.'}
                {!isLoad && 'Mods that edit the same cell without a patch can cause crashes when the player enters that area. Use xEdit to find overlapping CELL edits.'}
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
            title: 'Patch conflicts if needed',
            details: (
              <>
                If two mods edit the same records, create a compatibility patch in xEdit. Use your patching checklist as the baseline before making changes.
                {isCTD && <p className="mt-2 text-slate-400">Script-heavy mods (Sim Settlements, Workshop Framework) sometimes need load order patches, not just record patches.</p>}
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
                Use the same save / same location / same action that caused the crash. If it's fixed, repeat 2-3 times to be sure. One successful run is not sufficient verification.
              </>
            ),
          },
          {
            id: 'document',
            title: 'Document what fixed it',
            details: (
              <>
                Write a short "root cause + fix" note. This becomes your personal knowledge base and makes future debugging much faster. You can paste it into Mossy's chat and she'll store it in your Knowledge Vault.
              </>
            ),
          },
        ],
      },
    ];
  }, [state.scenario]);

  // Progress calculation
  const totalSteps = sections.reduce((acc, s) => acc + s.steps.length, 0);
  const completedSteps = Object.values(state.checked).filter(Boolean).length;
  const progressPct = totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0;

  const containerClassName = embedded ? 'bg-[#0a0e0a] text-slate-100 p-4' : 'min-h-full p-6 md:p-10 bg-[#0a0e0a] text-slate-100';

  return (
    <div className={containerClassName}>
      <div className="max-w-6xl mx-auto">
        {!embedded && (
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-8">
            <div>
              <div className="text-[10px] font-mono tracking-[0.3em] text-emerald-400/70 uppercase">Mossy Tutor • Crash Triage</div>
              <h1 className="text-3xl md:text-4xl font-black tracking-tight text-white mt-2">Crash & Bug Triage</h1>
              <p className="text-sm text-slate-400 mt-2 max-w-2xl">
                A repeatable, verification-first workflow for diagnosing crashes and hard bugs. This wizard avoids "try random fixes" and helps you isolate the real cause.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Link
                to="/reference"
                className="px-3 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg bg-emerald-900/20 border border-emerald-500/30 text-emerald-100 hover:bg-emerald-900/30 transition-colors"
                title="Open help"
              >
                Help
              </Link>
              <button
                type="button"
                onClick={() => { localStorage.removeItem(STORAGE_KEY); setState(DEFAULT_STATE); }}
                className="px-3 py-2 text-xs font-bold rounded-lg bg-red-900/20 border border-red-500/30 text-red-200 hover:bg-red-900/30 transition-colors flex items-center gap-1.5"
                title="Reset wizard progress"
              >
                <RefreshCw className="w-3 h-3" /> Reset
              </button>
            </div>
          </div>
        )}

        {/* Progress Bar */}
        <div className="rounded-xl border border-slate-800 bg-black/40 p-4 mb-6">
          <div className="flex items-center justify-between mb-2">
            <div className="text-xs font-bold text-slate-400 uppercase tracking-widest">Triage Progress</div>
            <div className="text-sm font-black text-white">{completedSteps} / {totalSteps} steps</div>
          </div>
          <div className="relative h-2 bg-slate-900 rounded-full overflow-hidden">
            <div
              className="absolute top-0 left-0 h-full bg-emerald-500 transition-all duration-300 rounded-full"
              style={{ width: `${progressPct}%` }}
            />
          </div>
          {completedSteps === totalSteps && totalSteps > 0 && (
            <div className="mt-2 text-xs text-emerald-400 font-bold flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4" /> All steps complete — your issue is fully triaged.
            </div>
          )}
        </div>

        {/* Scenario Selector */}
        <div className="rounded-xl border border-slate-800 bg-black/40 p-5 mb-6">
          <div className="flex flex-col gap-3">
            <div>
              <div className="text-xs font-black tracking-widest uppercase text-slate-400">Scenario</div>
              <div className="text-[11px] text-slate-400 mt-1">Pick the closest match — steps and hints will adapt accordingly.</div>
            </div>
            <div className="flex gap-2 flex-wrap">
              {(Object.entries(SCENARIO_LABELS) as [Scenario, string][]).map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setState((p) => ({ ...p, scenario: id }))}
                  className={`px-3 py-2 rounded-lg border text-[11px] font-black transition-colors ${state.scenario === id
                      ? 'bg-blue-900/30 border-blue-500/40 text-blue-200'
                      : 'bg-slate-900/40 border-slate-800 text-slate-300 hover:border-slate-600'
                    }`}
                >
                  {label}
                </button>
              ))}
            </div>
            {state.scenario && (
              <div className="p-3 bg-blue-900/10 border border-blue-800/30 rounded-lg text-xs text-blue-200">
                {SCENARIO_TIPS[state.scenario]}
              </div>
            )}
          </div>
        </div>

        {/* Downloads Panel */}
        <div className="rounded-xl border border-slate-800 bg-black/40 p-5 mb-6">
          <div className="flex items-center justify-between gap-4 mb-4">
            <div>
              <div className="text-xs font-black tracking-widest uppercase text-slate-400">Downloads & Sources</div>
              <div className="text-[11px] text-slate-400 mt-1">Prefer official/upstream links when available.</div>
            </div>
            <button
              type="button"
              onClick={() => openUrl('https://www.nexusmods.com/fallout4')}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-900/40 border border-slate-800 text-xs font-bold text-slate-200 hover:border-slate-600 transition-colors"
            >
              <ExternalLink className="w-4 h-4" />
              Open Nexus
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {links.map((url) => (
              <button
                key={url}
                type="button"
                onClick={() => openUrl(url)}
                className="text-left rounded-lg border border-slate-800 bg-slate-900/20 hover:border-slate-600 p-3 transition-colors"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-xs font-black text-white truncate">Nexus Link</div>
                    <div className="text-[10px] text-slate-500 truncate">{url}</div>
                  </div>
                  <ExternalLink className="w-4 h-4 text-slate-400 shrink-0" />
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Triage Steps */}
        <div className="space-y-6">
          {sections.map((section) => {
            const sectionDone = section.steps.every(s => isChecked(section.id, s.id));
            return (
              <div key={section.id} className={`rounded-xl border p-5 transition-colors ${sectionDone ? 'border-emerald-800/40 bg-emerald-950/10' : 'border-slate-800 bg-black/40'}`}>
                <div className="flex items-center justify-between gap-3 mb-4">
                  <div className="flex items-center gap-3">
                    <section.icon className={`w-5 h-5 ${sectionDone ? 'text-emerald-400' : 'text-emerald-300'}`} />
                    <div className="text-sm font-black text-white tracking-tight">{section.title}</div>
                  </div>
                  <div className="text-[10px] text-slate-500 font-mono">
                    {section.steps.filter(s => isChecked(section.id, s.id)).length}/{section.steps.length}
                  </div>
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
            );
          })}
        </div>

        <div className="mt-8 text-[11px] text-slate-500">
          If you want Mossy to help faster: export your Diagnostics report from the Diagnostic Tools page and paste the crash log into chat.
        </div>
      </div>
    </div>
  );
};

export default CrashTriageWizard;
