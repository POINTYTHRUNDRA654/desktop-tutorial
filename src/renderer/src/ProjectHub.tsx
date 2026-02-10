import React, { useState } from 'react';
import { BarChart3, ChevronDown, ChevronUp, FolderOpen, Settings as SettingsIcon, Trophy, Users } from 'lucide-react';
import ModProjectManager from './ModProjectManager';
import ModdingJourney from './ModdingJourney';
import { CollaborationManager } from './CollaborationManager';
import { AnalyticsManager } from './AnalyticsManager';
import { ProjectManager } from './ProjectManager';

type HubSection = {
  id: string;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  content: React.ReactNode;
};

const ProjectHub: React.FC = () => {
  const [expandedSection, setExpandedSection] = useState<string>('mod-projects');

  const toggleSection = (id: string) => {
    setExpandedSection((current) => (current === id ? '' : id));
  };

  const sections: HubSection[] = [
    {
      id: 'mod-projects',
      title: 'Step 1: Mod Projects',
      description: 'Create and manage your mod project plans.',
      icon: FolderOpen,
      content: <ModProjectManager embedded />,
    },
    {
      id: 'journey',
      title: 'Step 2: Modding Journey',
      description: 'Track achievements and progression milestones.',
      icon: Trophy,
      content: <ModdingJourney embedded />,
    },
    {
      id: 'collaboration',
      title: 'Step 3: Collaboration',
      description: 'Sessions and version control workflows.',
      icon: Users,
      content: <CollaborationManager embedded />,
    },
    {
      id: 'analytics',
      title: 'Step 4: Analytics',
      description: 'Review usage metrics and privacy controls.',
      icon: BarChart3,
      content: <AnalyticsManager embedded />,
    },
    {
      id: 'desktop-projects',
      title: 'Step 5: Desktop Project Manager',
      description: 'Manage Electron-backed projects when available.',
      icon: SettingsIcon,
      content: <ProjectManager embedded />,
    },
  ];

  return (
    <div className="min-h-full bg-[#0b0f0b] text-slate-100 p-6 md:p-10">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col gap-3 mb-8">
          <div className="text-[10px] font-mono tracking-[0.3em] text-emerald-400/70 uppercase">Mossy Core - Projects</div>
          <h1 className="text-3xl md:text-4xl font-black tracking-tight text-white">Projects Hub (All-in-One)</h1>
          <p className="text-sm font-medium text-slate-300 max-w-2xl">
            One flow for planning, tracking progress, collaborating, and reviewing analytics.
          </p>
        </div>

        <div className="mb-6 rounded-lg border border-emerald-700/30 bg-emerald-900/10 p-4 text-xs font-medium text-slate-300">
          <div className="font-bold text-slate-200">Flow (Read in Order)</div>
          <ol className="list-decimal list-inside mt-2 space-y-1 text-slate-300">
            <li>Start a mod project and outline your steps</li>
            <li>Track achievements and milestones</li>
            <li>Configure collaboration sessions when needed</li>
            <li>Review analytics and privacy controls</li>
            <li>Manage desktop projects (Electron)</li>
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
      </div>
    </div>
  );
};

export default ProjectHub;
