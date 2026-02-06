import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { BookOpen, CheckCircle2, ExternalLink, ScrollText, Send, ShieldCheck, Wrench } from 'lucide-react';
import { ToolsInstallVerifyPanel } from './components/ToolsInstallVerifyPanel';
import { openExternal } from './utils/openExternal';

type SectionId = 'setup' | 'quest' | 'dialogue' | 'scripts' | 'test' | 'ship';

type Step = { id: string; title: string; details: React.ReactNode };

type Section = {
  id: SectionId;
  title: string;
  icon: React.ComponentType<any>;
  steps: Step[];
};

type State = {
  checked: Record<string, boolean>; // `${sectionId}:${stepId}`
  goal: 'quest' | 'dialogue' | 'both';
};

const STORAGE_KEY = 'mossy_ck_quest_dialogue_state_v1';
const CHAT_PREFILL_KEY = 'mossy_chat_prefill_v1';

const DEFAULT_STATE: State = {
  checked: {},
  goal: 'both',
};

const safeParse = <T,>(raw: string | null, fallback: T): T => {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
};

const openUrl = (url: string) => {
  void openExternal(url);
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

export const CKQuestDialogueWizard: React.FC = () => {
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

  const sections: Section[] = useMemo(() => {
    return [
      {
        id: 'setup',
        title: 'Install & Setup',
        icon: Wrench,
        steps: [
          {
            id: 'ck-install',
            title: 'Install the Creation Kit',
            details: <>Install via the official channel you use (Steam/Bethesda). Then launch once to generate default files.</>,
          },
          {
            id: 'paths',
            title: 'Confirm CK is pointing at the right Fallout 4 install',
            details: <>If CK can’t find your game or assets, stop and fix that first. Avoid working from temporary folders.</>,
          },
        ],
      },
      {
        id: 'quest',
        title: 'Quest Skeleton',
        icon: ScrollText,
        steps: [
          {
            id: 'new-plugin',
            title: 'Create a new plugin for your mod',
            details: <>Start with a clean plugin and save early. Keep names consistent.</>,
          },
          {
            id: 'new-quest',
            title: 'Create a new Quest record',
            details: <>Use a minimal quest first: one stage, one objective, one test trigger.</>,
          },
        ],
      },
      {
        id: 'dialogue',
        title: 'Dialogue',
        icon: BookOpen,
        steps: [
          {
            id: 'topic',
            title: 'Create a Topic and a single test line',
            details: <>One NPC, one line, one condition. Keep it boring until it works.</>,
          },
          {
            id: 'conditions',
            title: 'Add conditions intentionally',
            details: <>Conditions are where dialogue often “disappears”. Add one at a time and test after each.</>,
          },
        ],
      },
      {
        id: 'scripts',
        title: 'Papyrus Scripts',
        icon: ShieldCheck,
        steps: [
          {
            id: 'compile',
            title: 'Compile scripts and fix errors immediately',
            details: <>Papyrus errors should not be ignored. Fix the first error, recompile, repeat.</>,
          },
          {
            id: 'logging',
            title: 'Enable Papyrus logging for debug builds',
            details: <>Enable logging only when debugging. Don’t ship with noisy debug logs unless needed.</>,
          },
        ],
      },
      {
        id: 'test',
        title: 'Test Loop',
        icon: ShieldCheck,
        steps: [
          {
            id: 'minimal-test',
            title: 'Test in a minimal load order',
            details: <>Use a clean profile: base game + your plugin + required dependencies only.</>,
          },
          {
            id: 'console',
            title: 'Create a repeatable test command',
            details: <>Have a quick way to start the quest, advance stages, and reset state for faster iteration.</>,
          },
        ],
      },
      {
        id: 'ship',
        title: 'Ship Safely',
        icon: ShieldCheck,
        steps: [
          {
            id: 'clean',
            title: 'Final clean-up pass',
            details: <>Remove debug-only assets, confirm scripts compile, and ensure documentation explains requirements.</>,
          },
        ],
      },
    ];
  }, []);

  const buildChatPrefill = () => {
    const goalLabel = state.goal === 'quest' ? 'Quest' : state.goal === 'dialogue' ? 'Dialogue' : 'Quest + Dialogue';
    const lines: string[] = [];
    lines.push("I'm using Mossy's CK Quest & Dialogue Wizard. Please guide me step-by-step.");
    lines.push(`Goal: ${goalLabel}`);
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
    lines.push('1) Tell me the next 3 unchecked steps, in order.');
    lines.push('2) Ask for my CK install source + whether I use MO2/Vortex.');
    lines.push('3) End with verification steps (repeatable test loop).');
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
    navigate('/chat', { state: { prefill: draft, from: 'ck-quest-dialogue' } });
  };

  return (
    <div className="min-h-full p-6 md:p-10 bg-[#0a0e0a] text-slate-100">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-8">
          <div>
            <div className="text-[10px] font-mono tracking-[0.3em] text-emerald-400/70 uppercase">Mossy Tutor • Creation Kit</div>
            <h1 className="text-3xl md:text-4xl font-black tracking-tight text-white mt-2">CK Quest & Dialogue</h1>
            <p className="text-sm text-slate-400 mt-2 max-w-2xl">
              A minimal-first workflow for quests and dialogue: get one boring test line working, then expand safely with verification.
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

        <ToolsInstallVerifyPanel
          accentClassName="text-emerald-300"
          description="This is a minimal-first Creation Kit workflow: one quest stage, one dialogue line, one script compile, then test. External tools are optional but commonly used."
          tools={[
            { label: 'Steam search: Fallout 4 Creation Kit', href: 'https://store.steampowered.com/search/?term=Fallout%204%20Creation%20Kit', kind: 'search' },
            { label: 'Nexus search: FO4Edit', href: 'https://www.nexusmods.com/fallout4/search/?gsearch=FO4Edit&gsearchtype=mods', kind: 'search', note: 'Optional for plugin sanity and conflict checks.' },
          ]}
          verify={[
            'Pick a goal (Quest / Dialogue / Both) and confirm the checklist updates.',
            'Check off a few steps and refresh; confirm progress persists.',
            'Click “Send to Chat” and confirm the generated “first boring test” plan appears in Chat.'
          ]}
          firstTestLoop={[
            'Create a new plugin → one quest stage → one dialogue line with minimal conditions.',
            'Compile scripts and fix the first error before continuing.',
            'Test in-game on a clean save and only then add complexity.'
          ]}
          troubleshooting={[
            'If dialogue does not show up, remove conditions and add them back one at a time.',
            'If scripts will not compile, verify your CK install and output paths before editing more logic.'
          ]}
          shortcuts={[
            { label: 'Platforms Hub', to: '/platforms' },
            { label: 'Template Generator', to: '/template-generator' },
            { label: 'Quick Reference', to: '/reference' },
            { label: 'Tool Settings', to: '/settings/tools' },
          ]}
        />

        <div className="rounded-xl border border-slate-800 bg-black/40 p-5 mb-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="text-xs font-black tracking-widest uppercase text-slate-400">Goal</div>
              <div className="text-[11px] text-slate-400 mt-1">Pick what you’re building right now.</div>
            </div>
            <div className="flex gap-2 flex-wrap justify-end">
              {([
                { id: 'quest' as const, label: 'Quest' },
                { id: 'dialogue' as const, label: 'Dialogue' },
                { id: 'both' as const, label: 'Both' },
              ]).map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setState((p) => ({ ...p, goal: s.id }))}
                  className={`px-3 py-2 rounded-lg border text-[11px] font-black transition-colors ${
                    state.goal === s.id
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
              <div className="text-xs font-black tracking-widest uppercase text-slate-400">Install & Verify</div>
              <div className="text-[11px] text-slate-400 mt-1">Before you write content, prove your toolchain works end-to-end.</div>
            </div>
            <div className="flex gap-2 flex-wrap justify-end">
              <button
                type="button"
                onClick={() => navigate('/install-wizard')}
                className="px-3 py-2 rounded-lg border text-[11px] font-black transition-colors bg-slate-900/40 border-slate-800 text-slate-300 hover:border-slate-600"
                title="Prereqs + install verification"
              >
                Install Wizard
              </button>
              <button
                type="button"
                onClick={() => navigate('/tts')}
                className="px-3 py-2 rounded-lg border text-[11px] font-black transition-colors bg-slate-900/40 border-slate-800 text-slate-300 hover:border-slate-600"
                title="Audio creation & FO4 voice pipeline notes"
              >
                TTS / Audio
              </button>
              <button
                type="button"
                onClick={() => navigate('/packaging-release')}
                className="px-3 py-2 rounded-lg border text-[11px] font-black transition-colors bg-slate-900/40 border-slate-800 text-slate-300 hover:border-slate-600"
                title="Packaging + release sanity checks"
              >
                Packaging
              </button>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="rounded-lg border border-slate-800 bg-slate-900/20 p-4">
              <div className="text-xs font-black text-white">CK verification loop</div>
              <ol className="mt-2 space-y-2 text-[11px] text-slate-300 leading-relaxed list-decimal pl-4">
                <li>Launch CK and load <span className="font-mono">Fallout4.esm</span> only.</li>
                <li>Create a tiny plugin: one Quest, Stage 10, one objective.</li>
                <li>Save and re-open CK to confirm the plugin loads cleanly.</li>
                <li>In-game: enable the plugin, start a new test save, and prove the quest can start/advance.</li>
              </ol>
            </div>

            <div className="rounded-lg border border-slate-800 bg-slate-900/20 p-4">
              <div className="text-xs font-black text-white">Papyrus & dialogue verification</div>
              <ul className="mt-2 space-y-2 text-[11px] text-slate-300 leading-relaxed">
                <li>• Compile one minimal script and confirm a <span className="font-mono">.pex</span> appears under <span className="font-mono">Data/Scripts</span>.</li>
                <li>• Create one test dialogue line. If using voices, plan for <span className="font-semibold">XWM/FUZ</span> and optional <span className="font-mono">.lip</span>.</li>
                <li>• If dialogue “disappears”, test conditions one at a time and verify the correct quest stage is set.</li>
              </ul>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {[
              { label: 'Steam search: Creation Kit', url: 'https://store.steampowered.com/search/?term=Fallout%204%20Creation%20Kit' },
              { label: 'Nexus search: FO4Edit', url: 'https://www.nexusmods.com/fallout4/search/?gsearch=FO4Edit&gsearchtype=mods' },
              { label: 'Nexus search: Papyrus', url: 'https://www.nexusmods.com/fallout4/search/?gsearch=Papyrus&gsearchtype=mods' },
            ].map((x) => (
              <button
                key={x.url}
                type="button"
                onClick={() => openUrl(x.url)}
                className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-900/40 border border-slate-800 text-xs font-bold text-slate-200 hover:border-slate-600 transition-colors"
                title={x.label}
              >
                <ExternalLink className="w-4 h-4" />
                {x.label}
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-slate-800 bg-black/40 p-5 mb-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="text-xs font-black tracking-widest uppercase text-slate-400">Helpful Searches</div>
              <div className="text-[11px] text-slate-400 mt-1">Use these when you need official documentation or tool references.</div>
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
            {[
              'https://www.nexusmods.com/fallout4/search/?gsearch=Creation%20Kit&gsearchtype=mods',
              'https://www.nexusmods.com/fallout4/search/?gsearch=Papyrus&gsearchtype=mods',
            ].map((url) => (
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
          Tip: Keep your first test quest extremely small. Once it works, expand.
        </div>
      </div>
    </div>
  );
};

export default CKQuestDialogueWizard;
