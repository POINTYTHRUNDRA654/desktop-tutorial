import React, { useState } from 'react';
import { AlertCircle, CheckCircle, AlertTriangle, FileText, Copy } from 'lucide-react';
import { ToolsInstallVerifyPanel } from './components/ToolsInstallVerifyPanel';

interface ValidationStep {
  id: string;
  title: string;
  category: 'critical' | 'warning' | 'info';
  description: string;
  checks: {
    item: string;
    status: 'unchecked' | 'pass' | 'fail';
    solution?: string;
  }[];
}

export const AnimationValidator: React.FC = () => {
  const [validationSteps, setValidationSteps] = useState<ValidationStep[]>([
    {
      id: 'setup',
      title: 'Animation Setup',
      category: 'critical',
      description: 'Verify basic animation configuration in Blender',
      checks: [
        {
          item: 'Frame rate is 24 fps (not 30, not 60)',
          status: 'unchecked',
          solution: 'Output properties → FPS: 24',
        },
        {
          item: 'Animation timeline has defined start/end frames',
          status: 'unchecked',
          solution: 'Set Timeline range to your animation duration',
        },
        {
          item: 'Armature is visible in viewport',
          status: 'unchecked',
          solution: 'Click eye icon next to armature in outliner',
        },
        {
          item: 'Keyframes exist and are not floating',
          status: 'unchecked',
          solution: 'Check Graph Editor for continuous keyframe lines',
        },
      ],
    },
    {
      id: 'skeleton',
      title: 'Skeleton Validation',
      category: 'critical',
      description: 'Ensure FO4 skeleton structure is correct',
      checks: [
        {
          item: 'NPC Root bone exists and is not animated',
          status: 'unchecked',
          solution: 'NPC Root should only have identity transform (no keyframes)',
        },
        {
          item: 'All 60+ FO4 bones present (no extras)',
          status: 'unchecked',
          solution: 'Delete any custom bones added (FO4 won\'t recognize them)',
        },
        {
          item: 'Bone names match FO4 standard exactly (case-sensitive)',
          status: 'unchecked',
          solution: 'Use Skeleton Reference tool to verify names',
        },
        {
          item: 'Pelvis is parent to all upper body bones',
          status: 'unchecked',
          solution: 'Check hierarchy: Pelvis → Spine → Chest → Arms',
        },
        {
          item: 'No bone name conflicts or duplicates',
          status: 'unchecked',
          solution: 'Outliner should show each bone once',
        },
      ],
    },
    {
      id: 'animation',
      title: 'Animation Content',
      category: 'critical',
      description: 'Verify animation data and keyframes',
      checks: [
        {
          item: 'Root bone (or NPC Root only) drives movement',
          status: 'unchecked',
          solution: 'Only NPC Root should have translation keyframes',
        },
        {
          item: 'First frame matches last frame (for looping)',
          status: 'unchecked',
          solution: 'Copy first pose to last frame: Shift+O',
        },
        {
          item: 'No animation keyframes outside timeline range',
          status: 'unchecked',
          solution: 'Check Graph Editor: delete floating keyframes',
        },
        {
          item: 'Animation curves are smooth (no sudden jumps)',
          status: 'unchecked',
          solution: 'Switch keyframes to Bezier curves for smooth transitions',
        },
        {
          item: 'No extreme bone rotations (>360°)',
          status: 'unchecked',
          solution: 'Graph Editor: use Normalize Curves',
        },
      ],
    },
    {
      id: 'weight',
      title: 'Weight Painting',
      category: 'warning',
      description: 'Check custom mesh weight painting quality',
      checks: [
        {
          item: 'All mesh vertices are weighted to bones',
          status: 'unchecked',
          solution: 'Weight Paint mode: verify no blue (unweighted) areas',
        },
        {
          item: 'No single bone has 100% weight on all verts',
          status: 'unchecked',
          solution: 'Use soft brush to blend weights at joints',
        },
        {
          item: 'Joint areas have overlapping weights',
          status: 'unchecked',
          solution: 'Elbow/shoulder should have 50/50 blend',
        },
        {
          item: 'Weight normalized (sum to 100% per vert)',
          status: 'unchecked',
          solution: 'Object → Weights → Normalize All',
        },
      ],
    },
    {
      id: 'export',
      title: 'Export Settings',
      category: 'critical',
      description: 'Verify NIF export configuration',
      checks: [
        {
          item: 'Export Scale set to 0.1',
          status: 'unchecked',
          solution: 'NIF export options → Scale: 0.1',
        },
        {
          item: 'Export Animation: YES',
          status: 'unchecked',
          solution: 'NIF export options → check "Export Animation"',
        },
        {
          item: 'Animation name is set correctly',
          status: 'unchecked',
          solution: 'Use descriptive names: idle, walk, attack_left, etc.',
        },
        {
          item: 'Export path is correct (Data/Meshes/Animations/)',
          status: 'unchecked',
          solution: 'Save to: Data\\Meshes\\Animations\\[modname]\\',
        },
        {
          item: 'Only armature selected (no mesh)',
          status: 'unchecked',
          solution: 'Deselect mesh, select only armature, then export',
        },
      ],
    },
    {
      id: 'nifskope',
      title: 'NifSkope Verification',
      category: 'critical',
      description: 'Verify exported NIF structure',
      checks: [
        {
          item: 'NiAnimationData node exists',
          status: 'unchecked',
          solution: 'Open in NifSkope → expand nodes → look for NiAnimationData',
        },
        {
          item: 'Animation controllers present (one per bone)',
          status: 'unchecked',
          solution: 'NiAnimationData should have NiTransformController children',
        },
        {
          item: 'Keyframe data is not empty',
          status: 'unchecked',
          solution: 'Expand controller nodes: should show rotation/translation data',
        },
        {
          item: 'No broken references (red text)',
          status: 'unchecked',
          solution: 'NifSkope shows broken refs in red: fix before import',
        },
      ],
    },
    {
      id: 'ingame',
      title: 'In-Game Testing',
      category: 'info',
      description: 'Final validation in Fallout 4',
      checks: [
        {
          item: 'Animation plays on character',
          status: 'unchecked',
          solution: 'Import NIF into mod, test on NPC',
        },
        {
          item: 'No clipping or stretching',
          status: 'unchecked',
          solution: 'If mesh deforms wrong, redo weight painting',
        },
        {
          item: 'Movement direction is correct',
          status: 'unchecked',
          solution: 'Character should move forward/back as intended',
        },
        {
          item: 'Animation transitions smoothly',
          status: 'unchecked',
          solution: 'No jerks or hitches: first frame = last frame',
        },
        {
          item: 'Animation speed matches intention',
          status: 'unchecked',
          solution: 'If too fast/slow, adjust frame count or FPS',
        },
      ],
    },
  ]);

  const toggleCheck = (stepId: string, checkIdx: number) => {
    setValidationSteps((prev) =>
      prev.map((step) =>
        step.id === stepId
          ? {
              ...step,
              checks: step.checks.map((check, idx) =>
                idx === checkIdx
                  ? {
                      ...check,
                      status:
                        check.status === 'unchecked'
                          ? 'pass'
                          : check.status === 'pass'
                            ? 'fail'
                            : 'unchecked',
                    }
                  : check
              ),
            }
          : step
      )
    );
  };

  const getCategoryIcon = (category: 'critical' | 'warning' | 'info') => {
    switch (category) {
      case 'critical':
        return <AlertCircle className="w-5 h-5 text-red-400" />;
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-yellow-400" />;
      case 'info':
        return <FileText className="w-5 h-5 text-blue-400" />;
    }
  };

  const getCategoryColor = (category: 'critical' | 'warning' | 'info') => {
    switch (category) {
      case 'critical':
        return 'border-red-700/50 bg-red-950/20';
      case 'warning':
        return 'border-yellow-700/50 bg-yellow-950/20';
      case 'info':
        return 'border-blue-700/50 bg-blue-950/20';
    }
  };

  const getCheckIcon = (status: 'unchecked' | 'pass' | 'fail') => {
    switch (status) {
      case 'pass':
        return <CheckCircle className="w-4 h-4 text-green-400" />;
      case 'fail':
        return <AlertCircle className="w-4 h-4 text-red-400" />;
      default:
        return <div className="w-4 h-4 border border-slate-500 rounded-full" />;
    }
  };

  const totalChecks = validationSteps.reduce((sum, step) => sum + step.checks.length, 0);
  const passedChecks = validationSteps.reduce(
    (sum, step) => sum + step.checks.filter((c) => c.status === 'pass').length,
    0
  );
  const failedChecks = validationSteps.reduce(
    (sum, step) => sum + step.checks.filter((c) => c.status === 'fail').length,
    0
  );

  return (
    <div className="h-full bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 overflow-hidden flex flex-col">
      {/* Header */}
      <div className="p-6 border-b border-slate-700 bg-slate-800/50">
        <div className="flex items-center gap-3 mb-4">
          <CheckCircle className="w-8 h-8 text-green-400" />
          <div>
            <h1 className="text-2xl font-bold text-white">Animation Validator</h1>
            <p className="text-sm text-slate-400">Pre-export checklist for FO4 animations</p>
          </div>
        </div>

        {/* Progress */}
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-slate-950/50 border border-slate-700 rounded p-3">
            <p className="text-xs text-slate-500 mb-1">Progress</p>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-cyan-400">{passedChecks}</span>
              <span className="text-sm text-slate-400">/ {totalChecks} passed</span>
            </div>
            <div className="w-full bg-slate-800 h-2 rounded mt-2 overflow-hidden">
              <div
                className="h-full bg-green-500 transition-all"
                style={{ width: `${totalChecks > 0 ? (passedChecks / totalChecks) * 100 : 0}%` }}
              />
            </div>
          </div>

          <div className="bg-slate-950/50 border border-slate-700 rounded p-3">
            <p className="text-xs text-slate-500 mb-1">Issues Found</p>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-red-400">{failedChecks}</span>
              <span className="text-sm text-slate-400">failures</span>
            </div>
          </div>

          <div className="bg-slate-950/50 border border-slate-700 rounded p-3">
            <p className="text-xs text-slate-500 mb-1">Status</p>
            <p
              className={`text-lg font-bold ${
                failedChecks === 0 && passedChecks === totalChecks
                  ? 'text-green-400'
                  : failedChecks > 0
                    ? 'text-red-400'
                    : 'text-yellow-400'
              }`}
            >
              {failedChecks === 0 && passedChecks === totalChecks
                ? 'Ready Export'
                : failedChecks > 0
                  ? 'Fix Issues'
                  : 'In Progress'}
            </p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-4xl mx-auto space-y-4">
          <ToolsInstallVerifyPanel
            accentClassName="text-emerald-300"
            description="Use this validator before your first export. The goal is to catch scale, naming, and timeline mistakes while they’re cheap to fix."
            tools={[
              { label: 'Blender (official download)', href: 'https://www.blender.org/download/', kind: 'official' },
            ]}
            verify={[
              'Toggle a few checks to Pass/Fail and refresh; confirm your progress persists.',
              'Use the “Fix Issues” state to drive the next action (don’t export until critical items are green).'
            ]}
            firstTestLoop={[
              'Pick one short animation → validate setup/skeleton/timeline → export once → test once.',
              'Only after a clean loop should you batch-export more clips.'
            ]}
            troubleshooting={[
              'If every check is failing, start with frame rate + bone naming + timeline range; those cause the most downstream confusion.',
              'If you are unsure about a bone name, cross-check with Skeleton Reference before touching the rig.'
            ]}
            shortcuts={[
              { label: 'Animation Guide', to: '/animation-guide' },
              { label: 'Skeleton Reference', to: '/skeleton-reference' },
              { label: 'Export Settings', to: '/export-settings' },
              { label: 'Havok Quick Start', to: '/havok-quick-start' },
            ]}
          />

          {validationSteps.map((step, stepIdx) => (
            <div key={step.id} className={`border rounded-lg overflow-hidden ${getCategoryColor(step.category)}`}>
              {/* Step Header */}
              <div className="px-6 py-4 bg-slate-900/50 border-b border-slate-700 flex items-start gap-4">
                <div className="flex-shrink-0 mt-1">{getCategoryIcon(step.category)}</div>
                <div className="flex-1">
                  <h3 className="font-bold text-white text-lg">{step.title}</h3>
                  <p className="text-sm text-slate-400 mt-1">{step.description}</p>
                </div>
                <div className="flex-shrink-0 text-right">
                  <p className="text-xs text-slate-500">
                    {step.checks.filter((c) => c.status === 'pass').length} /{' '}
                    {step.checks.length}
                  </p>
                </div>
              </div>

              {/* Checks */}
              <div className="p-6 space-y-3">
                {step.checks.map((check, checkIdx) => (
                  <div
                    key={checkIdx}
                    onClick={() => toggleCheck(step.id, checkIdx)}
                    className={`p-4 rounded border cursor-pointer transition-all ${
                      check.status === 'pass'
                        ? 'bg-green-950/20 border-green-700/50'
                        : check.status === 'fail'
                          ? 'bg-red-950/20 border-red-700/50'
                          : 'bg-slate-950/50 border-slate-700 hover:border-slate-600'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 mt-0.5">{getCheckIcon(check.status)}</div>
                      <div className="flex-1">
                        <p className="font-medium text-white">{check.item}</p>
                        {check.solution && check.status !== 'pass' && (
                          <p className="text-xs text-slate-400 mt-2">💡 {check.solution}</p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Footer Tip */}
      <div className="p-4 bg-cyan-900/20 border-t border-slate-700">
        <p className="text-xs text-cyan-300">
          💡 Save and test frequently! Export to NIF, open in NifSkope, and test in-game. Fix issues as you find them.
        </p>
      </div>
    </div>
  );
};
