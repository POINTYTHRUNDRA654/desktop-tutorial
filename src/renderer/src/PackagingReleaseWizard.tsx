import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Archive, CheckCircle2, ExternalLink, Package, Send, ShieldCheck } from 'lucide-react';
import { ToolsInstallVerifyPanel } from './components/ToolsInstallVerifyPanel';
import { openExternal } from './utils/openExternal';

type SectionId = 'structure' | 'assets' | 'plugin' | 'ba2' | 'qa' | 'release';

type Step = { id: string; title: string; details: React.ReactNode };

type Section = {
  id: SectionId;
  title: string;
  icon: React.ComponentType<any>;
  steps: Step[];
};

type State = {
  checked: Record<string, boolean>; // `${sectionId}:${stepId}`
  distribution: 'nexus' | 'discord' | 'private';
};

const STORAGE_KEY = 'mossy_packaging_release_state_v1';
const CHAT_PREFILL_KEY = 'mossy_chat_prefill_v1';

const DEFAULT_STATE: State = {
  checked: {},
  distribution: 'nexus',
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

export const PackagingReleaseWizard: React.FC = () => {
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
        id: 'structure',
        title: 'Project Structure',
        icon: Package,
        steps: [
          {
            id: 'names',
            title: 'Pick a stable mod name + version',
            details: <>Use semantic-ish versioning (e.g., 0.1.0, 0.2.0, 1.0.0). Never reuse a version number for different files.</>,
          },
          {
            id: 'folders',
            title: 'Confirm your folder paths are correct',
            details: <>Textures must be under <span className="font-mono">textures\</span>, meshes under <span className="font-mono">meshes\</span>, scripts under <span className="font-mono">scripts\</span>, etc. Incorrect paths cause missing assets.</>,
          },
        ],
      },
      {
        id: 'assets',
        title: 'Asset Sanity',
        icon: ShieldCheck,
        steps: [
          {
            id: 'texture-format',
            title: 'Validate texture formats',
            details: <>Use the Vault to spot common mistakes (oversized textures, missing normal maps). Always verify in-game.</>,
          },
          {
            id: 'mesh-paths',
            title: 'Verify mesh texture/material paths',
            details: <>If you use NIF tools, double-check that paths are relative and match your planned folder structure.</>,
          },
        ],
      },
      {
        id: 'plugin',
        title: 'Plugin Sanity',
        icon: ShieldCheck,
        steps: [
          {
            id: 'masters',
            title: 'No missing masters',
            details: <>Missing masters are release-stoppers. Verify your plugin loads cleanly and that dependencies are clearly documented.</>,
          },
          {
            id: 'flags',
            title: 'ESL/ESP/ESM flags are intentional',
            details: <>Don’t flip flags “because it fits”. Understand the implications and test on a fresh save if required.</>,
          },
        ],
      },
      {
        id: 'ba2',
        title: 'BA2 Packaging',
        icon: Archive,
        steps: [
          {
            id: 'loose-vs-ba2',
            title: 'Decide: loose files vs BA2',
            details: <>BA2 is usually preferred for distribution. Some workflows require loose files during development; package at release time.</>,
          },
          {
            id: 'archive2',
            title: 'Build BA2 with Archive2',
            details: <>Use Archive2 (part of Bethesda tools) to pack your assets. Validate the archive contents match your intended paths.</>,
          },
        ],
      },
      {
        id: 'qa',
        title: 'QA Test Matrix',
        icon: ShieldCheck,
        steps: [
          {
            id: 'clean-profile',
            title: 'Test in a clean profile',
            details: <>Install only your mod + required dependencies. Confirm it works without your personal mod list masking issues.</>,
          },
          {
            id: 'new-game',
            title: 'Test new game and existing save (when relevant)',
            details: <>Some mods are not safe to add/remove mid-save. Be explicit in your description.</>,
          },
        ],
      },
      {
        id: 'release',
        title: 'Release Checklist',
        icon: Package,
        steps: [
          {
            id: 'readme',
            title: 'Write a clear README',
            details: <>Include: what it does, requirements, install steps, uninstall steps, and known conflicts.</>,
          },
          {
            id: 'changelog',
            title: 'Write a changelog entry',
            details: <>List user-visible changes and any save-game safety notes.</>,
          },
        ],
      },
    ];
  }, []);

  const buildChatPrefill = () => {
    const distro = state.distribution === 'nexus' ? 'Nexus' : state.distribution === 'discord' ? 'Discord' : 'Private';
    const lines: string[] = [];
    lines.push("I'm using Mossy's Packaging & Release Wizard. Please guide me step-by-step.");
    lines.push(`Distribution target: ${distro}`);
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
    lines.push('2) Ask for my exact asset types (textures/meshes/scripts/etc) and mod manager.');
    lines.push('3) End with verification steps (clean profile test).');
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
    navigate('/chat', { state: { prefill: draft, from: 'packaging-release' } });
  };

  return (
    <div className="min-h-full p-6 md:p-10 bg-[#0a0e0a] text-slate-100">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-8">
          <div>
            <div className="text-[10px] font-mono tracking-[0.3em] text-emerald-400/70 uppercase">Mossy Tutor • Packaging</div>
            <h1 className="text-3xl md:text-4xl font-black tracking-tight text-white mt-2">Packaging & Release</h1>
            <p className="text-sm text-slate-400 mt-2 max-w-2xl">
              A practical release checklist so your mod installs cleanly and behaves predictably. This focuses on paths, packaging, and verification.
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
          description="Packaging is where mods fail silently (wrong paths, missing masters, bad archives). Use this checklist to verify the build before you upload anywhere."
          tools={[
            { label: 'Steam search: Fallout 4 Creation Kit (Archive2)', href: 'https://store.steampowered.com/search/?term=Fallout%204%20Creation%20Kit', kind: 'search', note: 'Archive2 ships with the CK install.' },
            { label: '7-Zip (official site)', href: 'https://www.7-zip.org/', kind: 'official', note: 'Useful for inspecting archive contents and release zips.' },
            { label: 'Nexus search: FO4Edit', href: 'https://www.nexusmods.com/fallout4/search/?gsearch=FO4Edit&gsearchtype=mods', kind: 'search', note: 'Optional but helpful for plugin sanity checks.' },
          ]}
          verify={[
            'Check off a few items and refresh; confirm progress persists.',
            'Use the Vault to generate a manifest and confirm paths match your planned folder structure.',
            'Click “Send to Chat” and confirm the release checklist summary is prefilled.'
          ]}
          firstTestLoop={[
            'Build the archive (or prepare loose files) → install into a clean test profile → launch and verify assets load.',
            'Only after a clean test loop should you bump version and package a release zip.'
          ]}
          troubleshooting={[
            'If assets are missing in-game, it is almost always a path problem; re-check folder structure first.',
            'If the archive contents look right but the game is wrong, test with only your mod enabled in a clean profile.'
          ]}
          shortcuts={[
            { label: 'Platforms Hub', to: '/platforms' },
            { label: 'The Vault', to: '/vault' },
            { label: 'Tool Settings', to: '/settings/tools' },
            { label: 'Crash Triage', to: '/crash-triage' },
          ]}
        />

        <div className="rounded-xl border border-slate-800 bg-black/40 p-5 mb-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="text-xs font-black tracking-widest uppercase text-slate-400">Distribution</div>
              <div className="text-[11px] text-slate-400 mt-1">This affects how strict your packaging and documentation should be.</div>
            </div>
            <div className="flex gap-2 flex-wrap justify-end">
              {([
                { id: 'nexus' as const, label: 'Nexus' },
                { id: 'discord' as const, label: 'Discord' },
                { id: 'private' as const, label: 'Private' },
              ]).map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setState((p) => ({ ...p, distribution: s.id }))}
                  className={`px-3 py-2 rounded-lg border text-[11px] font-black transition-colors ${
                    state.distribution === s.id
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
              <div className="text-[11px] text-slate-400 mt-1">A release isn’t “done” until you can install it cleanly and prove it works.</div>
            </div>
            <div className="flex gap-2 flex-wrap justify-end">
              <button
                type="button"
                onClick={() => navigate('/vault')}
                className="px-3 py-2 rounded-lg border text-[11px] font-black transition-colors bg-slate-900/40 border-slate-800 text-slate-300 hover:border-slate-600"
                title="Validate assets in The Vault"
              >
                The Vault
              </button>
              <button
                type="button"
                onClick={() => navigate('/install-wizard')}
                className="px-3 py-2 rounded-lg border text-[11px] font-black transition-colors bg-slate-900/40 border-slate-800 text-slate-300 hover:border-slate-600"
                title="Prereqs + install verification"
              >
                Install Wizard
              </button>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="rounded-lg border border-slate-800 bg-slate-900/20 p-4">
              <div className="text-xs font-black text-white">Tool reality check</div>
              <ul className="mt-2 space-y-2 text-[11px] text-slate-300 leading-relaxed">
                <li>• <span className="font-semibold">Archive2</span>: comes with CK installs; verify you can create/open a BA2 and that file paths inside the archive match <span className="font-mono">Data/...</span></li>
                <li>• <span className="font-semibold">FO4Edit/xEdit</span>: verify your plugin loads with zero “missing masters” warnings</li>
                <li>• <span className="font-semibold">BAE (optional)</span>: verify you can inspect your BA2 after building (sanity-check contents)</li>
              </ul>
            </div>

            <div className="rounded-lg border border-slate-800 bg-slate-900/20 p-4">
              <div className="text-xs font-black text-white">Minimum verification loop (do this every release)</div>
              <ol className="mt-2 space-y-2 text-[11px] text-slate-300 leading-relaxed list-decimal pl-4">
                <li>Build your zip/BA2 exactly like you will publish it.</li>
                <li>Install into a <span className="font-semibold">clean profile</span> (only required deps + your mod).</li>
                <li>Start a new game (or a safe test save) and verify the headline feature in under 2 minutes.</li>
                <li>Do one “uninstall + reinstall” cycle to catch missing loose files and stale scripts.</li>
              </ol>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {[
              { label: 'Nexus search: FO4Edit', url: 'https://www.nexusmods.com/fallout4/search/?gsearch=FO4Edit&gsearchtype=mods' },
              { label: 'Nexus search: BAE', url: 'https://www.nexusmods.com/fallout4/search/?gsearch=BAE&gsearchtype=mods' },
              { label: 'Steam search: Creation Kit', url: 'https://store.steampowered.com/search/?term=Fallout%204%20Creation%20Kit' },
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
              <div className="text-[11px] text-slate-400 mt-1">Use these if you need the official tools or documentation.</div>
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
              'https://www.nexusmods.com/fallout4/search/?gsearch=Archive2&gsearchtype=mods',
              'https://www.nexusmods.com/fallout4/search/?gsearch=Creation%20Kit&gsearchtype=mods',
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
          Tip: Use <Link className="text-blue-400 hover:underline" to="/vault">The Vault</Link> to validate assets before packaging.
        </div>
      </div>
    </div>
  );
};

export default PackagingReleaseWizard;
