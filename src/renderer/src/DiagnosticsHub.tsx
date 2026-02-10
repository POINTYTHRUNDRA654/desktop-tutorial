import React, { useState } from 'react';
import { Activity, ChevronDown, ChevronUp, Wrench, ShieldCheck, Bug } from 'lucide-react';
import SystemMonitor from './SystemMonitor';
import ToolVerify from './ToolVerify';
import DiagnosticTools from './DiagnosticTools';
import CrashTriageWizard from './CrashTriageWizard';

type HubSection = {
  id: string;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  content: React.ReactNode;
};

const DiagnosticsHub: React.FC = () => {
  const [expandedSection, setExpandedSection] = useState<string>('system-monitor');

  const toggleSection = (id: string) => {
    setExpandedSection((current) => (current === id ? '' : id));
  };

  const sections: HubSection[] = [
    {
      id: 'system-monitor',
      title: 'Step 1: System Monitor',
      description: 'Telemetry, scans, and bridge status for the desktop app.',
      icon: Activity,
      content: <SystemMonitor embedded />,
    },
    {
      id: 'tool-verify',
      title: 'Step 2: Tool Verify',
      description: 'Validate paths, versions, and launch tests for external tools.',
      icon: Wrench,
      content: <ToolVerify embedded />,
    },
    {
      id: 'diagnostic-tools',
      title: 'Step 3: Diagnostic Tools',
      description: 'Check APIs, permissions, storage, and secrets visibility.',
      icon: ShieldCheck,
      content: <DiagnosticTools embedded />,
    },
    {
      id: 'crash-triage',
      title: 'Step 4: Crash & Bug Triage',
      description: 'Repro, isolate, fix, and verify stubborn crashes.',
      icon: Bug,
      content: <CrashTriageWizard embedded />,
    },
  ];

  return (
    <div className="min-h-full bg-[#0b0f0b] text-slate-100 p-6 md:p-10">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col gap-3 mb-8">
          <div className="text-[10px] font-mono tracking-[0.3em] text-emerald-400/70 uppercase">Mossy Tutor • Diagnostics</div>
          <h1 className="text-3xl md:text-4xl font-black tracking-tight text-white">Diagnostics Hub (All-in-One)</h1>
          <p className="text-sm font-medium text-slate-300 max-w-2xl">
            A single flow for system checks, tool verification, API diagnostics, and crash triage.
          </p>
        </div>

        <div className="mb-6 rounded-lg border border-emerald-700/30 bg-emerald-900/10 p-4 text-xs font-medium text-slate-300">
          <div className="font-bold text-slate-200">Flow (Read in Order)</div>
          <ol className="list-decimal list-inside mt-2 space-y-1 text-slate-300">
            <li>Confirm system monitor health</li>
            <li>Verify tool paths and versions</li>
            <li>Run API and permission diagnostics</li>
            <li>Use crash triage for reproducible issues</li>
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

export default DiagnosticsHub;
