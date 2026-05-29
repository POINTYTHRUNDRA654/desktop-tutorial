import React, { useState, useCallback } from 'react';
import {
  Archive,
  ChevronDown,
  ChevronUp,
  Package,
  Search,
  GitCompare,
  Database,
  Layers,
  GitBranch,
  Upload,
  Rocket,
  CheckCircle2,
  Circle,
} from 'lucide-react';
import PackagingReleaseWizard from './PackagingReleaseWizard';
import TheAssembler from './TheAssembler';
import ModConflictVisualizer from './ModConflictVisualizer';
import ModComparisonTool from './ModComparisonTool';
import { BA2Manager } from './BA2Manager';
import ConflictResolver from './ConflictResolver';
import { ConflictGraph } from './ConflictGraph';
import { BethelUploader } from './BethelUploader';
import ReleaseExportPanel from './ReleaseExportPanel';

type HubSection = {
  id: string;
  step?: number;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  content: React.ReactNode;
};

const WORKFLOW_STEPS = ['ba2', 'checklist', 'conflicts', 'comparison', 'assembler', 'export'];

const PackagingHub: React.FC = () => {
  const [expandedSection, setExpandedSection] = useState<string>(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('section') || 'checklist';
  });

  // Track which workflow steps have been opened (visited)
  const [visitedSteps, setVisitedSteps] = useState<Set<string>>(() => {
    try {
      const raw = localStorage.getItem('mossy_packaging_visited_steps_v1');
      return raw ? new Set(JSON.parse(raw)) : new Set();
    } catch {
      return new Set();
    }
  });

  const toggleSection = useCallback((id: string) => {
    setExpandedSection((current) => {
      const next = current === id ? '' : id;
      return next;
    });

    // Mark step as visited if it's a workflow step
    if (WORKFLOW_STEPS.includes(id)) {
      setVisitedSteps((prev) => {
        const next = new Set(prev).add(id);
        try {
          localStorage.setItem('mossy_packaging_visited_steps_v1', JSON.stringify([...next]));
        } catch { /* ignore */ }
        return next;
      });
    }
  }, []);

  const visitedWorkflowCount = WORKFLOW_STEPS.filter((s) => visitedSteps.has(s)).length;
  const workflowPct = Math.round((visitedWorkflowCount / WORKFLOW_STEPS.length) * 100);

  const sections: HubSection[] = [
    {
      id: 'ba2',
      step: 0,
      title: 'Step 0: BA2 Archive Manager',
      description: 'List, extract, pack, and merge BA2 archives before packaging.',
      icon: Database,
      content: <BA2Manager />,
    },
    {
      id: 'checklist',
      step: 1,
      title: 'Step 1: Packaging Checklist',
      description: 'Verify paths, archives, plugin sanity, and release readiness.',
      icon: Archive,
      content: <PackagingReleaseWizard embedded />,
    },
    {
      id: 'conflicts',
      step: 2,
      title: 'Step 2: Conflict Analysis',
      description: 'Visualize record conflicts between your mod and others.',
      icon: Search,
      content: <ModConflictVisualizer embedded />,
    },
    {
      id: 'comparison',
      step: 3,
      title: 'Step 3: Mod Comparison',
      description: 'Compare your mod with similar mods for compatibility.',
      icon: GitCompare,
      content: <ModComparisonTool embedded />,
    },
    {
      id: 'assembler',
      step: 4,
      title: 'Step 4: FOMOD Installer (Assembler)',
      description: 'Build and export a FOMOD installer for your release package.',
      icon: Package,
      content: <TheAssembler embedded />,
    },
    {
      id: 'export',
      step: 5,
      title: 'Step 5: Export & Release',
      description: 'Build your release zip, write release notes, and publish to Nexus or Bethesda.net.',
      icon: Rocket,
      content: <ReleaseExportPanel />,
    },
    {
      id: 'conflict-resolver',
      title: 'Conflict Resolver',
      description: 'Resolve plugin record conflicts and generate patch recommendations.',
      icon: Layers,
      content: <ConflictResolver embedded />,
    },
    {
      id: 'conflict-graph',
      title: 'Conflict Dependency Graph',
      description: 'Visualize mod conflict relationships as an interactive dependency graph.',
      icon: GitBranch,
      content: <ConflictGraph />,
    },
    {
      id: 'bethel-uploader',
      title: 'Bethesda.net Publisher',
      description: 'Package and upload mods directly to Bethesda.net (Creation Club compatible).',
      icon: Upload,
      content: <BethelUploader />,
    },
  ];

  const workflowSections = sections.filter((s) => s.step !== undefined);
  const advancedSections = sections.filter((s) => s.step === undefined);

  return (
    <div className="min-h-full bg-[#0b0f0b] text-slate-100 p-6 md:p-10">
      <div className="max-w-6xl mx-auto">

        {/* Header */}
        <div className="flex flex-col gap-3 mb-6">
          <div className="text-[10px] font-mono tracking-[0.3em] text-emerald-400/70 uppercase">Mossy Tutor • Packaging</div>
          <h1 className="text-3xl md:text-4xl font-black tracking-tight text-white">FO4 Packaging &amp; Release Hub</h1>
          <p className="text-sm font-medium text-slate-300 max-w-2xl">
            Complete workflow for packaging, conflict analysis, comparison, FOMOD installers, and release. Follow the steps in order for best results.
          </p>
        </div>

        {/* Workflow Progress Strip */}
        <div className="mb-6 rounded-xl border border-emerald-700/30 bg-emerald-900/10 p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="text-xs font-black tracking-widest uppercase text-slate-300">Workflow Progress</div>
            <div className="text-xs font-mono text-emerald-400">{visitedWorkflowCount} / {WORKFLOW_STEPS.length} steps visited</div>
          </div>

          {/* Progress bar */}
          <div className="h-1.5 w-full rounded-full bg-slate-800 overflow-hidden mb-4">
            <div
              className="h-full rounded-full bg-emerald-500 transition-all duration-500"
              style={{ width: `${workflowPct}%` }}
            />
          </div>

          {/* Step pills */}
          <div className="flex flex-wrap gap-2">
            {workflowSections.map((s) => {
              const visited = visitedSteps.has(s.id);
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => toggleSection(s.id)}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[10px] font-bold uppercase tracking-wider transition-colors ${
                    visited
                      ? 'bg-emerald-900/30 border-emerald-600/40 text-emerald-300'
                      : 'bg-slate-900/40 border-slate-700 text-slate-500'
                  }`}
                >
                  {visited ? (
                    <CheckCircle2 className="w-3 h-3" />
                  ) : (
                    <Circle className="w-3 h-3" />
                  )}
                  Step {s.step}: {s.title.replace(/^Step \d+: /, '')}
                </button>
              );
            })}
          </div>
        </div>

        {/* Flow Reference */}
        <div className="mb-6 rounded-lg border border-slate-700/40 bg-slate-900/30 p-4 text-xs font-medium text-slate-300">
          <div className="font-bold text-slate-200 mb-2">Flow (Read in Order)</div>
          <ol className="list-decimal list-inside space-y-1 text-slate-300">
            <li>Manage BA2 archives (pack, extract, merge)</li>
            <li>Run the packaging checklist</li>
            <li>Check for conflicts with other mods</li>
            <li>Compare with similar mods for compatibility</li>
            <li>Build your FOMOD installer</li>
            <li>Export, write release notes, and publish</li>
          </ol>
        </div>

        {/* Workflow Steps */}
        <div className="space-y-3 mb-8">
          {workflowSections.map((section) => {
            const isExpanded = expandedSection === section.id;
            const visited = visitedSteps.has(section.id);
            const Icon = section.icon;

            return (
              <div
                key={section.id}
                className={`border rounded-lg overflow-hidden transition-colors ${
                  isExpanded
                    ? 'border-emerald-700/50 bg-black/40'
                    : 'border-slate-800 bg-black/20'
                }`}
              >
                <button
                  type="button"
                  onClick={() => toggleSection(section.id)}
                  className="w-full px-4 py-3 flex items-center justify-between text-left bg-slate-900/50 hover:bg-slate-900/80 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <Icon className="w-5 h-5 text-emerald-300" />
                      {visited && (
                        <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-emerald-500" />
                      )}
                    </div>
                    <div>
                      <div className="text-sm font-black text-white">{section.title}</div>
                      <div className="text-xs font-medium text-slate-400">{section.description}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {visited && !isExpanded && (
                      <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">Visited</span>
                    )}
                    {isExpanded ? (
                      <ChevronUp className="w-4 h-4 text-emerald-300" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-slate-500" />
                    )}
                  </div>
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

        {/* Advanced Tools */}
        <div className="mb-4">
          <div className="text-[10px] font-mono tracking-[0.3em] text-slate-500 uppercase mb-3">Advanced Tools</div>
          <div className="space-y-3">
            {advancedSections.map((section) => {
              const isExpanded = expandedSection === section.id;
              const Icon = section.icon;

              return (
                <div key={section.id} className="border border-slate-800 rounded-lg overflow-hidden bg-black/20">
                  <button
                    type="button"
                    onClick={() => toggleSection(section.id)}
                    className="w-full px-4 py-3 flex items-center justify-between text-left bg-slate-900/40 hover:bg-slate-900/60 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <Icon className="w-5 h-5 text-slate-400" />
                      <div>
                        <div className="text-sm font-black text-white">{section.title}</div>
                        <div className="text-xs font-medium text-slate-400">{section.description}</div>
                      </div>
                    </div>
                    {isExpanded ? (
                      <ChevronUp className="w-4 h-4 text-slate-400" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-slate-600" />
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
    </div>
  );
};

export default PackagingHub;
