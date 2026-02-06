import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  BookOpen,
  Bug,
  Archive,
  Wrench,
  Hammer,
  ShieldCheck,
  ExternalLink,
  GitMerge,
  Boxes,
  Mic,
  Film,
  ScrollText,
} from 'lucide-react';
import { ToolsInstallVerifyPanel } from './components/ToolsInstallVerifyPanel';
import { openExternal } from './utils/openExternal';

type PlatformCard = {
  title: string;
  description: string;
  to?: string;
  externalUrl?: string;
  icon: React.ComponentType<any>;
  badge?: string;
};

const openUrl = (url: string) => {
  void openExternal(url);
};

export const PlatformsHub: React.FC = () => {
  const navigate = useNavigate();

  const cards: PlatformCard[] = [
    {
      title: 'Crash & Bug Triage',
      description: 'Step-by-step CTD / infinite load / broken saves troubleshooting with verification steps.',
      to: '/crash-triage',
      icon: Bug,
      badge: 'Wizard',
    },
    {
      title: 'Packaging & Release',
      description: 'BA2 packaging, Archive2 workflow, folder structure, versioning, and release sanity checks.',
      to: '/packaging-release',
      icon: Archive,
      badge: 'Wizard',
    },
    {
      title: 'CK Quest & Dialogue',
      description: 'Creation Kit quest + dialogue workflow, Papyrus compile/debug, safe testing loop.',
      to: '/ck-quest-dialogue',
      icon: ScrollText,
      badge: 'Wizard',
    },
    {
      title: 'Install Wizard',
      description: 'Tool installs and setup: xEdit, SS2, PRP, patching.',
      to: '/install-wizard',
      icon: Wrench,
    },
    {
      title: 'Precombine & PRP Guide',
      description: 'Performance-critical guidance with risk checks and verification steps.',
      to: '/precombine-prp',
      icon: Hammer,
    },
    {
      title: 'PRP Patch Builder',
      description: 'Generate a PRP compatibility patch target + README + verification checklist.',
      to: '/prp-patch-builder',
      icon: GitMerge,
      badge: 'Wizard',
    },
    {
      title: 'The Vault (Assets + BA2 staging)',
      description: 'Validate textures/meshes and generate BA2 manifests.',
      to: '/vault',
      icon: Boxes,
    },
    {
      title: 'Audio Studio',
      description: 'Voice pipelines, TTS tooling, and audio workflow helpers.',
      to: '/tts',
      icon: Mic,
    },
    {
      title: 'Animation Guide',
      description: 'Blender-to-FO4 rig/anim best practices and common failure modes.',
      to: '/animation-guide',
      icon: Film,
    },
    {
      title: 'Quest Mod Authoring',
      description: 'Guide content for quests and narrative mods.',
      to: '/quest-authoring',
      icon: BookOpen,
    },
    {
      title: 'Trusted Searches (Nexus)',
      description: 'Use curated Nexus searches when Mossy cannot cite a direct official URL.',
      externalUrl: 'https://www.nexusmods.com/fallout4',
      icon: ShieldCheck,
      badge: 'External',
    },
  ];

  return (
    <div className="min-h-full p-6 md:p-10 bg-[#0a0e0a] text-slate-100">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-8">
          <div>
            <div className="text-[10px] font-mono tracking-[0.3em] text-emerald-400/70 uppercase">Mossy Tutor • Platforms</div>
            <h1 className="text-3xl md:text-4xl font-black tracking-tight text-white mt-2">Modding Platforms</h1>
            <p className="text-sm text-slate-400 mt-2 max-w-2xl">
              A practical map of the tools and workflows modders actually use. Each platform links to a guided flow with downloads, install steps, verification, and troubleshooting.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => navigate('/chat')}
              className="px-3 py-2 text-xs font-bold rounded-lg bg-slate-900 border border-slate-800 hover:border-slate-600 transition-colors"
              title="Ask Mossy in chat"
            >
              Ask Mossy
            </button>
          </div>
        </div>

        <ToolsInstallVerifyPanel
          accentClassName="text-emerald-300"
          description="Pick a platform to open a guided flow. If you’re unsure where to start, run Diagnostics first, then choose the wizard that matches your immediate goal."
          verify={[
            'Click one card and confirm it navigates to the correct wizard page.',
            'Return here and confirm scroll position and navigation remain responsive.'
          ]}
          firstTestLoop={[
            'Start with “Crash & Bug Triage” if you are unstable, otherwise start with “Install Wizard”.',
            'After completing a wizard’s first loop, jump to Tool Settings to configure only what you actually need.'
          ]}
          shortcuts={[
            { label: 'Diagnostics', to: '/diagnostics' },
            { label: 'Install Wizard', to: '/install-wizard' },
            { label: 'Crash Triage', to: '/crash-triage' },
            { label: 'Tool Settings', to: '/settings/tools' },
          ]}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {cards.map((c) => {
            const body = (
              <div className="rounded-xl border border-slate-800 bg-black/40 hover:border-slate-600 transition-colors p-5 h-full">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="p-2 rounded-lg bg-slate-900/40 border border-slate-800">
                      <c.icon className="w-5 h-5 text-emerald-300" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-black text-white truncate">{c.title}</div>
                      <div className="text-[11px] text-slate-400 mt-1">{c.description}</div>
                    </div>
                  </div>
                  {c.badge && (
                    <div className="text-[10px] font-black uppercase tracking-widest text-emerald-200 border border-emerald-500/30 bg-emerald-900/10 px-2 py-1 rounded">
                      {c.badge}
                    </div>
                  )}
                </div>
              </div>
            );

            if (c.to) {
              return (
                <Link key={c.title} to={c.to} className="block">
                  {body}
                </Link>
              );
            }

            return (
              <button
                key={c.title}
                type="button"
                onClick={() => c.externalUrl && openUrl(c.externalUrl)}
                className="text-left"
                title={c.externalUrl}
              >
                <div className="relative">
                  {body}
                  <ExternalLink className="absolute right-5 top-5 w-4 h-4 text-slate-500" />
                </div>
              </button>
            );
          })}
        </div>

        <div className="mt-8 text-[11px] text-slate-500">
          Tip: If you’re unsure which platform you need, click “Ask Mossy” and tell her what kind of mod you’re making (quests, weapons, settlements, performance, animation).
        </div>
      </div>
    </div>
  );
};

export default PlatformsHub;
