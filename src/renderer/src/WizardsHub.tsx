import React, { useCallback, useEffect, useState } from 'react';
import {
  Archive,
  Bug,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Circle,
  Compass,
  GitMerge,
  ScrollText,
  Wrench,
  Zap,
  ChevronRight,
} from 'lucide-react';
import PlatformsHub from './PlatformsHub';
import { InstallWizard } from './InstallWizard';
import { PRPPatchBuilderWizard } from './PRPPatchBuilderWizard';
import CrashTriageWizard from './CrashTriageWizard';
import CKQuestDialogueWizard from './CKQuestDialogueWizard';
import { Link } from 'react-router-dom';

// ─── types ────────────────────────────────────────────────────────────────────

type FO4Version = 'og' | 'ng' | 'ae';

type SectionId =
  | 'platforms'
  | 'install'
  | 'crash-triage'
  | 'ck-quest'
  | 'packaging'
  | 'prp-patch';

type HubSection = {
  id: SectionId;
  stepNum: number;
  title: string;
  subtitle: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  content: React.ReactNode;
  storageKey?: string;
  estimatedTime: string;
  badge?: string;
  optional?: boolean;
};

// ─── helpers ─────────────────────────────────────────────────────────────────

const safeParse = <T,>(raw: string | null, fallback: T): T => {
  if (!raw) return fallback;
  try { return JSON.parse(raw) as T; } catch { return fallback; }
};

/** Returns true if the wizard's localStorage state has ANY checked step. */
function wizardHasProgress(storageKey: string): boolean {
  const raw = localStorage.getItem(storageKey);
  if (!raw) return false;
  const parsed = safeParse<{ checked?: Record<string, boolean>; yourModName?: string }>(raw, {});
  if (parsed.checked) return Object.values(parsed.checked).some(Boolean);
  if (parsed.yourModName) return (parsed.yourModName as string).trim().length > 0;
  return false;
}

/** Counts checked / total for a wizard's checklist state. */
function wizardProgress(storageKey: string): { checked: number; total: number } {
  const raw = localStorage.getItem(storageKey);
  if (!raw) return { checked: 0, total: 0 };
  const parsed = safeParse<{ checked?: Record<string, boolean> }>(raw, {});
  if (!parsed.checked) return { checked: 0, total: 0 };
  const vals = Object.values(parsed.checked);
  return { checked: vals.filter(Boolean).length, total: vals.length };
}

// ─── sub-components ───────────────────────────────────────────────────────────

const VersionBadge: React.FC<{ version: FO4Version }> = ({ version }) => {
  const map: Record<FO4Version, { label: string; cls: string }> = {
    og:  { label: 'OG  1.10.163', cls: 'text-amber-300 border-amber-500/40 bg-amber-900/10' },
    ng:  { label: 'NG  1.10.984+', cls: 'text-sky-300 border-sky-500/40 bg-sky-900/10' },
    ae:  { label: 'AE / Creations', cls: 'text-purple-300 border-purple-500/40 bg-purple-900/10' },
  };
  const { label, cls } = map[version];
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-widest border ${cls}`}>
      {label}
    </span>
  );
};

const StepDot: React.FC<{ state: 'done' | 'started' | 'todo'; stepNum: number }> = ({ state, stepNum }) => {
  if (state === 'done') {
    return (
      <div className="w-7 h-7 rounded-full bg-emerald-600 border-2 border-emerald-400 flex items-center justify-center shrink-0">
        <CheckCircle2 className="w-4 h-4 text-white" />
      </div>
    );
  }
  if (state === 'started') {
    return (
      <div className="w-7 h-7 rounded-full bg-amber-900/40 border-2 border-amber-500 flex items-center justify-center shrink-0">
        <span className="text-[11px] font-black text-amber-300">{stepNum}</span>
      </div>
    );
  }
  return (
    <div className="w-7 h-7 rounded-full bg-slate-900 border-2 border-slate-700 flex items-center justify-center shrink-0">
      <span className="text-[11px] font-black text-slate-500">{stepNum}</span>
    </div>
  );
};

// ─── main component ───────────────────────────────────────────────────────────

const STORAGE_KEY_HUB = 'mossy_wizards_hub_state_v2';
const STORAGE_KEY_VERSION = 'mossy_wizards_hub_fo4_version';

// Per-wizard localStorage keys used for completion tracking
const WIZARD_STORAGE: Record<SectionId, string | null> = {
  platforms:    null,
  install:      'mossy_install_wizard_state_v1',
  'crash-triage': 'mossy_crash_triage_state_v1',
  'ck-quest':   'mossy_ck_quest_dialogue_state_v1',
  packaging:    null, // PackagingHub is a hub, not a checklist — mark as "started" when visited
  'prp-patch':  'mossy_prp_patch_builder_state_v1',
};

const WizardsHub: React.FC = () => {
  const [expandedSection, setExpandedSection] = useState<SectionId | ''>(() => {
    const stored = safeParse<{ expanded?: string }>(localStorage.getItem(STORAGE_KEY_HUB), {});
    return (stored.expanded as SectionId) || 'platforms';
  });

  const [fo4Version, setFo4Version] = useState<FO4Version>(() => {
    return (localStorage.getItem(STORAGE_KEY_VERSION) as FO4Version) || 'og';
  });

  // Track which sections have been visited (for packaging which has no checklist)
  const [visitedSections, setVisitedSections] = useState<Set<SectionId>>(() => {
    const stored = safeParse<{ visited?: string[] }>(localStorage.getItem(STORAGE_KEY_HUB), {});
    return new Set((stored.visited ?? []) as SectionId[]);
  });

  // Persist hub state
  useEffect(() => {
    const visited = Array.from(visitedSections);
    localStorage.setItem(STORAGE_KEY_HUB, JSON.stringify({ expanded: expandedSection, visited }));
  }, [expandedSection, visitedSections]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_VERSION, fo4Version);
  }, [fo4Version]);

  const toggleSection = useCallback((id: SectionId) => {
    setExpandedSection((curr) => curr === id ? '' : id);
    setVisitedSections((prev) => new Set([...prev, id]));
  }, []);

  /** Derive step state from localStorage + visited tracking */
  const getSectionState = (id: SectionId): 'done' | 'started' | 'todo' => {
    const key = WIZARD_STORAGE[id];
    if (key) {
      const prog = wizardProgress(key);
      if (prog.total > 0 && prog.checked === prog.total) return 'done';
      if (prog.checked > 0) return 'started';
      // Fallback for wizards that store form fields instead of a checked[] map
      // (e.g. PRPPatchBuilderWizard uses yourModName + boolean flags, not checked[])
      if (wizardHasProgress(key)) return 'started';
    }
    if (id === 'packaging' && visitedSections.has('packaging')) return 'started';
    if (id === 'platforms' && visitedSections.has('platforms')) return 'started';
    return 'todo';
  };

  const sections: HubSection[] = [
    {
      id: 'platforms',
      stepNum: 1,
      title: 'Choose a Platform',
      subtitle: 'Identify your goal and pick the right wizard',
      description: 'Start here. The platform map shows every major FO4 modding workflow and links you directly to the wizard that matches what you are trying to do — scripting, textures, animations, settlements, quests, or load order.',
      icon: Compass,
      content: <PlatformsHub embedded />,
      estimatedTime: '2 min',
    },
    {
      id: 'install',
      stepNum: 2,
      title: 'Install Wizard',
      subtitle: 'F4SE, xEdit, SS2, PRP, and patching prerequisites',
      description: 'Install and verify every core tool: F4SE (Script Extender), xEdit/FO4Edit, Sim Settlements 2 dependencies, the PRP previs toolkit, and patch-building workflow. Complete this before any content wizard.',
      icon: Wrench,
      content: <InstallWizard embedded />,
      storageKey: 'mossy_install_wizard_state_v1',
      estimatedTime: '15–45 min',
      badge: 'Core',
    },
    {
      id: 'crash-triage',
      stepNum: 3,
      title: 'Crash & Bug Triage',
      subtitle: 'CTD / infinite load / broken saves troubleshooting',
      description: 'Step-by-step diagnosis for crash-to-desktop, infinite loading screen, broken save games, and other instability. Use this any time your game stops working — it walks you through isolation, log reading, and fix verification.',
      icon: Bug,
      content: <CrashTriageWizard embedded />,
      storageKey: 'mossy_crash_triage_state_v1',
      estimatedTime: '10–30 min',
      badge: 'Triage',
      optional: true,
    },
    {
      id: 'ck-quest',
      stepNum: 4,
      title: 'CK Quest & Dialogue',
      subtitle: 'Creation Kit quest authoring, Papyrus compile + test loop',
      description: 'Guided workflow for Creation Kit quest creation, dialogue setup, Papyrus script compilation, and the safe test loop. Covers CK crash prevention, editor setup, and how to verify your quest works before shipping.',
      icon: ScrollText,
      content: <CKQuestDialogueWizard embedded />,
      storageKey: 'mossy_ck_quest_dialogue_state_v1',
      estimatedTime: '20–60 min',
      optional: true,
    },
    {
      id: 'packaging',
      stepNum: 5,
      title: 'Packaging & Release',
      subtitle: 'BA2 packaging, folder structure, versioning, and release checks',
      description: 'BA2 archive packaging, folder structure validation, versioning, Nexus / Bethesda.net upload preparation, and final release sanity checks. Run this before uploading any mod.',
      icon: Archive,
      content: (
        <div className="p-4 space-y-4">
          <div className="rounded-lg border border-emerald-700/30 bg-emerald-900/10 p-4 text-sm text-slate-300">
            <div className="font-bold text-slate-200 mb-2">What this covers</div>
            <ul className="space-y-1.5 text-xs">
              <li className="flex items-start gap-2"><ChevronRight className="w-3 h-3 text-emerald-400 mt-0.5 shrink-0" />BA2 archive creation — Archive2, BSArch, BSArchPro workflows</li>
              <li className="flex items-start gap-2"><ChevronRight className="w-3 h-3 text-emerald-400 mt-0.5 shrink-0" />Mod folder structure — Data layout, plugin naming, texture/mesh paths</li>
              <li className="flex items-start gap-2"><ChevronRight className="w-3 h-3 text-emerald-400 mt-0.5 shrink-0" />FOMOD installer creation for multi-option mod packaging</li>
              <li className="flex items-start gap-2"><ChevronRight className="w-3 h-3 text-emerald-400 mt-0.5 shrink-0" />Version tagging and changelog preparation</li>
              <li className="flex items-start gap-2"><ChevronRight className="w-3 h-3 text-emerald-400 mt-0.5 shrink-0" />Nexus upload checklist and Bethesda.net Creations upload flow</li>
              <li className="flex items-start gap-2"><ChevronRight className="w-3 h-3 text-emerald-400 mt-0.5 shrink-0" />Final stability and conflict verification before release</li>
            </ul>
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <Link
              to="/packaging-release"
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-emerald-700/20 border border-emerald-600/40 text-emerald-200 text-sm font-black hover:bg-emerald-700/30 transition-colors"
            >
              <Archive className="w-4 h-4" />
              Open Packaging & Release Hub
            </Link>
            <Link
              to="/tools/ba2-manager"
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-slate-800/60 border border-slate-700 text-slate-300 text-sm font-black hover:bg-slate-800 transition-colors"
            >
              <Zap className="w-4 h-4" />
              BA2 Manager (quick tool)
            </Link>
          </div>
          <div className="text-[11px] text-slate-500">
            The Packaging Hub contains the full BA2 workflow, FOMOD builder, conflict resolver, and mod comparison tools.
          </div>
        </div>
      ),
      estimatedTime: '10–30 min',
      optional: true,
    },
    {
      id: 'prp-patch',
      stepNum: 6,
      title: 'PRP Patch Builder',
      subtitle: 'Generate PRP compatibility patch target + README',
      description: 'Generate a PRP previs/precombine compatibility patch plan, README template, and verification checklist. Run this only after your mod is stable and you are ready to create or contribute a PRP patch for your worldspace edits.',
      icon: GitMerge,
      content: <PRPPatchBuilderWizard embedded />,
      storageKey: 'mossy_prp_patch_builder_state_v1',
      estimatedTime: '5–10 min',
      optional: true,
    },
  ];

  // Overall progress: how many sections have been started or done
  const startedCount = sections.filter(s => getSectionState(s.id) !== 'todo').length;
  const doneCount = sections.filter(s => getSectionState(s.id) === 'done').length;
  const progressPct = Math.round((startedCount / sections.length) * 100);

  const versionOptions: Array<{ id: FO4Version; label: string; note: string }> = [
    { id: 'og',  label: 'OG',  note: '1.10.163 — pre–Next-Gen patch (April 2024)' },
    { id: 'ng',  label: 'NG',  note: '1.10.984+ — Next-Gen / current Steam default' },
    { id: 'ae',  label: 'AE',  note: 'Creations Menu / Anniversary Edition content' },
  ];

  return (
    <div className="min-h-full bg-[#0b0f0b] text-slate-100 p-6 md:p-10">
      <div className="max-w-6xl mx-auto">

        {/* ── Header ─────────────────────────────────────────────────── */}
        <div className="flex flex-col gap-3 mb-6">
          <div className="text-[10px] font-mono tracking-[0.3em] text-emerald-400/70 uppercase">Mossy Tutor · FO4 Setup Wizards</div>
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
            <div>
              <h1 className="text-3xl md:text-4xl font-black tracking-tight text-white">FO4 Setup Wizards Hub</h1>
              <p className="text-sm font-medium text-slate-400 max-w-2xl mt-2">
                The complete Fallout 4 modding setup flow — from tool install through crash triage, quest authoring, packaging, and previs patching. Work through the steps in order, or jump to any section you need.
              </p>
            </div>
            {/* Game version selector */}
            <div className="shrink-0">
              <div className="text-[10px] font-mono text-slate-500 uppercase tracking-widest mb-1">Game Version</div>
              <div className="flex gap-1.5">
                {versionOptions.map(v => (
                  <button
                    key={v.id}
                    type="button"
                    title={v.note}
                    onClick={() => setFo4Version(v.id)}
                    className={`px-3 py-1.5 rounded-lg text-[11px] font-black uppercase tracking-widest border transition-colors ${
                      fo4Version === v.id
                        ? 'bg-emerald-700/30 border-emerald-500/60 text-emerald-200'
                        : 'bg-slate-900/50 border-slate-700 text-slate-500 hover:text-slate-300 hover:border-slate-600'
                    }`}
                  >
                    {v.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ── Progress bar ───────────────────────────────────────────── */}
        <div className="mb-6 rounded-xl border border-slate-800 bg-black/30 p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="text-xs font-bold text-slate-300">
              Setup Progress
              <span className="ml-2 text-slate-500 font-normal">
                {doneCount} completed · {startedCount} started · {sections.length - startedCount} remaining
              </span>
            </div>
            <div className="flex items-center gap-2">
              <VersionBadge version={fo4Version} />
              <span className="text-xs font-black text-emerald-300">{progressPct}%</span>
            </div>
          </div>
          <div className="h-2 rounded-full bg-slate-800 overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-emerald-600 to-emerald-400 transition-all duration-500"
              style={{ width: `${progressPct}%` }}
            />
          </div>

          {/* Step dots quick overview */}
          <div className="flex items-center gap-2 mt-4 flex-wrap">
            {sections.map((s, i) => {
              const state = getSectionState(s.id);
              return (
                <React.Fragment key={s.id}>
                  <button
                    type="button"
                    onClick={() => toggleSection(s.id)}
                    title={`Step ${s.stepNum}: ${s.title}`}
                    className="flex items-center gap-1.5 group"
                  >
                    <StepDot state={state} stepNum={s.stepNum} />
                    <span className={`text-[11px] font-bold hidden sm:block transition-colors group-hover:text-white ${
                      state === 'done' ? 'text-emerald-400' :
                      state === 'started' ? 'text-amber-300' :
                      'text-slate-500'
                    }`}>
                      {s.title}
                    </span>
                  </button>
                  {i < sections.length - 1 && (
                    <ChevronRight className="w-3 h-3 text-slate-700 shrink-0" />
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </div>

        {/* ── Flow hint ─────────────────────────────────────────────── */}
        <div className="mb-6 rounded-lg border border-emerald-700/30 bg-emerald-900/10 p-4 text-xs font-medium text-slate-300">
          <div className="font-bold text-slate-200 mb-1.5">Recommended flow</div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <div className="flex items-start gap-1.5">
              <span className="text-emerald-400 font-black">1–2</span>
              <span>Start with <b>Choose a Platform</b> then complete the <b>Install Wizard</b> for every tool you will use.</span>
            </div>
            <div className="flex items-start gap-1.5">
              <span className="text-amber-400 font-black">3–4</span>
              <span><b>Crash Triage</b> and <b>CK Quest</b> are situational — use them when you hit those workflows.</span>
            </div>
            <div className="flex items-start gap-1.5">
              <span className="text-sky-400 font-black">5–6</span>
              <span>Run <b>Packaging</b> before uploading. Run <b>PRP Patch Builder</b> only if your mod edits worldspaces.</span>
            </div>
          </div>
        </div>

        {/* ── Accordion sections ─────────────────────────────────────── */}
        <div className="space-y-3">
          {sections.map((section) => {
            const isExpanded = expandedSection === section.id;
            const Icon = section.icon;
            const stepState = getSectionState(section.id);
            const storageKey = WIZARD_STORAGE[section.id];
            const prog = storageKey ? wizardProgress(storageKey) : null;

            return (
              <div
                key={section.id}
                className={`border rounded-xl overflow-hidden transition-colors ${
                  isExpanded
                    ? 'border-emerald-700/50 bg-black/40'
                    : stepState === 'done'
                      ? 'border-emerald-800/50 bg-black/20'
                      : 'border-slate-800 bg-black/20'
                }`}
              >
                {/* Accordion header */}
                <button
                  type="button"
                  onClick={() => toggleSection(section.id)}
                  className="w-full px-5 py-4 flex items-center justify-between text-left hover:bg-slate-900/30 transition-colors"
                >
                  <div className="flex items-center gap-4 min-w-0">
                    {/* Step dot */}
                    <StepDot state={stepState} stepNum={section.stepNum} />

                    {/* Icon + text */}
                    <div className="p-2 rounded-lg bg-slate-900/60 border border-slate-800 shrink-0">
                      <Icon className="w-4 h-4 text-emerald-300" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-black text-white">
                          Step {section.stepNum}: {section.title}
                        </span>
                        {section.badge && (
                          <span className="text-[10px] font-black uppercase tracking-widest text-emerald-200 border border-emerald-500/30 bg-emerald-900/10 px-2 py-0.5 rounded">
                            {section.badge}
                          </span>
                        )}
                        {section.optional && (
                          <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 border border-slate-700 px-2 py-0.5 rounded">
                            Situational
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-slate-400 mt-0.5">{section.subtitle}</div>
                    </div>
                  </div>

                  {/* Right side: time + progress + chevron */}
                  <div className="flex items-center gap-4 shrink-0 ml-4">
                    {prog && prog.total > 0 && (
                      <div className="hidden sm:flex items-center gap-1.5">
                        <div className="text-[11px] font-bold text-slate-400">
                          {prog.checked}/{prog.total}
                        </div>
                        <div className="w-16 h-1.5 rounded-full bg-slate-800 overflow-hidden">
                          <div
                            className="h-full rounded-full bg-emerald-500 transition-all"
                            style={{ width: `${(prog.checked / prog.total) * 100}%` }}
                          />
                        </div>
                      </div>
                    )}
                    <span className="hidden md:block text-[11px] text-slate-600 font-mono">~{section.estimatedTime}</span>
                    {isExpanded
                      ? <ChevronUp className="w-4 h-4 text-emerald-400" />
                      : <ChevronDown className="w-4 h-4 text-slate-500" />
                    }
                  </div>
                </button>

                {/* Description bar (always visible) */}
                {!isExpanded && (
                  <div className="px-5 pb-3">
                    <p className="text-[11px] text-slate-500 leading-relaxed ml-[calc(1.75rem+1.25rem+0.75rem)]">
                      {section.description}
                    </p>
                  </div>
                )}

                {/* Expanded content */}
                {isExpanded && (
                  <div className="border-t border-slate-800 bg-[#090d09]">
                    {section.content}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* ── Footer tip ─────────────────────────────────────────────── */}
        <div className="mt-8 flex items-start gap-3 text-[11px] text-slate-500">
          <Circle className="w-3 h-3 text-slate-700 mt-0.5 shrink-0" />
          <span>
            Your progress is saved automatically. Steps marked complete in each wizard are remembered across sessions.
            Use the <b>Ask Mossy</b> button at any time if you get stuck — Mossy knows your current wizard context.
          </span>
        </div>

      </div>
    </div>
  );
};

export default WizardsHub;
