import React, { useState } from 'react';
import { ArrowDownToLine, ChevronDown, ChevronUp, Lock, Map, Settings as SettingsIcon, Wrench } from 'lucide-react';
import PrivacySettings from './PrivacySettings';
import LanguageSettings from './LanguageSettings';
import ExternalToolsSettings from './ExternalToolsSettings';
import { SettingsImportExport } from './SettingsImportExport';

type HubSection = {
  id: string;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  content: React.ReactNode;
};

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

export default SettingsHub;
