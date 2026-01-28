import React, { useState } from 'react';
import { Settings, Copy, CheckCircle2, AlertCircle, ChevronDown } from 'lucide-react';
import { ToolsInstallVerifyPanel } from './components/ToolsInstallVerifyPanel';

interface ExportScenario {
  id: string;
  title: string;
  description: string;
  use_case: string;
  settings: {
    scale: string;
    export_animation: boolean;
    export_skeleton: boolean;
    export_mesh: boolean;
    only_selected: boolean;
    animation_name?: string;
  };
  checklist: string[];
  common_mistakes: string[];
}

export const ExportSettingsHelper: React.FC = () => {
  const [selectedScenario, setSelectedScenario] = useState<string>('custom-mesh');
  const [copiedSetting, setCopiedSetting] = useState<string>('');
  const [expandedMistake, setExpandedMistake] = useState<string>('');

  const scenarios: ExportScenario[] = [
    {
      id: 'custom-mesh',
      title: 'Custom Mesh/Armor (No Animation)',
      description: 'Exporting a rigged custom character body or armor piece without animation',
      use_case: 'When: You have weight-painted a custom body/armor and want to test it in-game',
      settings: {
        scale: '0.1',
        export_animation: false,
        export_skeleton: false,
        export_mesh: true,
        only_selected: true,
      },
      checklist: [
        '✓ Only the ARMATURE is selected (not mesh)',
        '✓ Scale: 0.1 (critical - matches import)',
        '✓ Export Animation: OFF (unchecked)',
        '✓ Export Skeleton: OFF (unchecked)',
        '✓ Export Mesh: ON (checked)',
        '✓ Only Selected: ON (checked)',
        '✓ Export path: Data\\Meshes\\Clothes\\ or Data\\Meshes\\Armor\\',
        '✓ Filename: descriptive (my_armor.nif, custom_body.nif)',
      ],
      common_mistakes: [
        'Forgetting to deselect mesh → exports mesh AND skeleton (bloated file)',
        'Scale wrong (1.0 instead of 0.1) → character appears 10x larger in-game',
        'Export Skeleton: ON → creates duplicate bones (causes crashes)',
        'Export path wrong → game won\'t find mesh (invisible character)',
      ],
    },
    {
      id: 'animation-only',
      title: 'Animation Only (Armature Skeleton)',
      description: 'Exporting a custom animation for an existing skeleton',
      use_case: 'When: You\'ve created idle, walk, attack animations and want to test them',
      settings: {
        scale: '0.1',
        export_animation: true,
        export_skeleton: false,
        export_mesh: false,
        only_selected: true,
        animation_name: 'idle',
      },
      checklist: [
        '✓ Only the ARMATURE is selected (not mesh)',
        '✓ Scale: 0.1 (MUST match import scale)',
        '✓ Export Animation: ON (checked)',
        '✓ Export Skeleton: OFF (unchecked)',
        '✓ Export Mesh: OFF (unchecked)',
        '✓ Only Selected: ON (checked)',
        '✓ Animation Name: Set to your animation name (idle, walk_forward, attack_left)',
        '✓ Export path: Data\\Meshes\\Animations\\[modname]\\',
        '✓ Timeline range: 1-60 (or your animation duration)',
        '✓ Frame rate: match the target/vanilla animation (commonly 30 fps for FO4 humanoids; verify in Output properties)',
      ],
      common_mistakes: [
        'Export Mesh: ON → adds mesh geometry (unnecessary, bloats file)',
        'Export Skeleton: ON → creates duplicate bone hierarchy (breaks animation)',
        'Animation Name left blank → animation won\'t play in-game',
        'Export path wrong → game can\'t find animation',
        'Mesh selected too → exports unintended mesh data',
        'Timeline extends beyond animation → exports extra empty frames',
      ],
    },
    {
      id: 'rigged-custom',
      title: 'Custom Rigged Character (Full Export)',
      description: 'Exporting a fully rigged custom body with skeleton and animation',
      use_case: 'When: You\'ve created a custom body mesh, weight-painted it, AND created animations',
      settings: {
        scale: '0.1',
        export_animation: true,
        export_skeleton: true,
        export_mesh: true,
        only_selected: true,
        animation_name: 'idle_pose',
      },
      checklist: [
        '✓ Only the ARMATURE is selected',
        '✓ Scale: 0.1 (critical)',
        '✓ Export Animation: ON (you have animations)',
        '✓ Export Skeleton: ON (you have custom bones)',
        '✓ Export Mesh: ON (you have custom mesh)',
        '✓ Only Selected: ON (checked)',
        '✓ Animation Name: Set (e.g., "idle_pose")',
        '✓ Mesh weight-painted: All vertices assigned (no blue in Weight Paint mode)',
        '✓ Bone names: Match FO4 exactly (case-sensitive)',
        '✓ Export path: Data\\Meshes\\Actors\\Character\\[modname]\\',
      ],
      common_mistakes: [
        'Custom bones added to skeleton → FO4 won\'t recognize (causes crashes)',
        'Only Selected: OFF → exports entire scene (unwanted objects included)',
        'Weight painting incomplete → mesh deforms wrong in-game (vertices not assigned)',
        'Animation Name wrong → animation won\'t play',
        'Bone names don\'t match → animation data orphaned (no bones to animate)',
      ],
    },
    {
      id: 'skeleton-only',
      title: 'Skeleton Only (Armature Reference)',
      description: 'Exporting just the skeleton for reference or testing',
      use_case: 'When: You want to verify bone structure or create a reference for another animator',
      settings: {
        scale: '0.1',
        export_animation: false,
        export_skeleton: true,
        export_mesh: false,
        only_selected: true,
      },
      checklist: [
        '✓ Only the ARMATURE is selected',
        '✓ Scale: 0.1',
        '✓ Export Animation: OFF (no animations)',
        '✓ Export Skeleton: ON',
        '✓ Export Mesh: OFF',
        '✓ Only Selected: ON',
        '✓ Export path: Data\\Meshes\\Skeletons\\ (or project folder)',
      ],
      common_mistakes: [
        'Export Mesh: ON → unnecessary (skeleton only needed)',
        'Export Animation: ON → wastes file space if no animations',
        'Only Selected: OFF → exports extra geometry',
      ],
    },
  ];

  const commonMistakes = [
    {
      id: 'scale-error',
      title: '❌ Scale Wrong (1.0 instead of 0.1)',
      symptom: 'Character appears 10x larger than vanilla actors',
      cause: 'Export scale doesn\'t match import scale',
      fix: 'Export options → Scale: 0.1 (MUST be 0.1)',
      icon: '⚠️',
    },
    {
      id: 'mesh-selected',
      title: '❌ Mesh Selected During Export',
      symptom: 'Animation file huge; skeleton + mesh + animations all exported',
      cause: 'Both armature AND mesh selected when exporting',
      fix: 'Deselect all (A), then select ONLY the armature (click armature in Outliner)',
      icon: '🚫',
    },
    {
      id: 'animation-flag',
      title: '❌ Export Animation Flag Wrong',
      symptom: 'Animation doesn\'t play in-game',
      cause: 'Export Animation: OFF when it should be ON (or vice versa)',
      fix: 'Toggle "Export Animation" based on scenario (check helper above)',
      icon: '🎬',
    },
    {
      id: 'anim-name',
      title: '❌ Animation Name Blank',
      symptom: 'Exported NIF has no animation data',
      cause: 'Animation Name field left empty',
      fix: 'Set Animation Name to your animation name (idle, walk, attack, etc.)',
      icon: '📝',
    },
    {
      id: 'skeleton-flag',
      title: '❌ Export Skeleton: ON (When Should Be OFF)',
      symptom: 'Duplicate bone hierarchy; animation crashes game',
      cause: 'Exported skeleton inside animation (creates nested bones)',
      fix: 'For animations only: Export Skeleton = OFF. For custom rigged bodies: ON',
      icon: '💀',
    },
    {
      id: 'custom-bones',
      title: '❌ Custom Bones Added to Skeleton',
      symptom: 'Game crash on animation; FO4 doesn\'t recognize bones',
      cause: 'Added custom bones to FO4 skeleton (FO4 uses fixed skeleton only)',
      fix: 'Delete custom bones. Parent your mesh to existing bones instead.',
      icon: '🦴',
    },
    {
      id: 'path-wrong',
      title: '❌ Export Path Wrong',
      symptom: 'Mesh/animation file not found by game',
      cause: 'Exported to wrong folder in Data directory',
      fix: 'Use correct path: Data\\Meshes\\Animations\\[modname]\\ or Data\\Meshes\\Clothes\\ etc.',
      icon: '📁',
    },
    {
      id: 'only-selected',
      title: '❌ Only Selected: OFF',
      symptom: 'Export file contains entire scene (huge, unwanted objects)',
      cause: 'Exported everything in viewport instead of just armature',
      fix: 'Toggle "Only Selected" = ON before exporting',
      icon: '📦',
    },
  ];

  const scenario = scenarios.find((s) => s.id === selectedScenario)!;

  const handleCopy = (setting: string) => {
    navigator.clipboard.writeText(setting);
    setCopiedSetting(setting);
    setTimeout(() => setCopiedSetting(''), 2000);
  };

  return (
    <div className="h-full bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 overflow-hidden flex flex-col">
      {/* Header */}
      <div className="p-6 border-b border-slate-700 bg-slate-800/50">
        <div className="flex items-center gap-3 mb-4">
          <Settings className="w-8 h-8 text-orange-400" />
          <div>
            <h1 className="text-2xl font-bold text-white">Better Blender 3 Export Settings</h1>
            <p className="text-sm text-slate-400">Exact settings for every export scenario</p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-6xl mx-auto space-y-6">
          <ToolsInstallVerifyPanel
            accentClassName="text-orange-300"
            description="Use this page to avoid the classic export traps (wrong scale, wrong selection, wrong path). Pick one scenario, export a tiny file, and verify the result before you continue modeling/animating."
            tools={[
              { label: 'Blender (official download)', href: 'https://www.blender.org/download/', kind: 'official' },
              { label: 'Nexus search: Better Blender 3', href: 'https://www.nexusmods.com/fallout4/search/?gsearch=Better%20Blender%203&gsearchtype=mods', kind: 'search' },
            ]}
            verify={[
              'Switch scenarios and confirm the settings + checklist update immediately.',
              'Use Copy on one setting and confirm your clipboard updates.',
              'Confirm the “Export path” guidance matches your intended Data\Meshes subfolder.'
            ]}
            firstTestLoop={[
              'Export the smallest thing possible (one pose, one mesh, or one 20-frame clip).',
              'Verify file exists, has reasonable size, and loads in your next step (NIF/HKX tooling or in-game).'
            ]}
            troubleshooting={[
              'If the character is 10× too big/small, your scale is wrong (typically 1.0 vs 0.1).',
              'If the file contains “extra stuff”, re-check “Only Selected” and what is selected at export time.'
            ]}
            shortcuts={[
              { label: 'Animation Guide', to: '/animation-guide' },
              { label: 'Rigging Checklist', to: '/rigging-checklist' },
              { label: 'Rigging Mistakes', to: '/rigging-mistakes' },
              { label: 'Animation Validator', to: '/animation-validator' },
            ]}
          />

          {/* Scenario Selector */}
          <div className="space-y-3">
            <h2 className="text-lg font-bold text-white">Select Your Scenario</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {scenarios.map((s) => (
                <button
                  key={s.id}
                  onClick={() => setSelectedScenario(s.id)}
                  className={`p-4 rounded-lg border text-left transition-all ${
                    selectedScenario === s.id
                      ? 'bg-orange-500/20 border-orange-500 shadow-lg shadow-orange-500/20'
                      : 'bg-slate-800 border-slate-700 hover:border-slate-600'
                  }`}
                >
                  <p className="font-bold text-white">{s.title}</p>
                  <p className="text-xs text-slate-400 mt-1">{s.description}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Current Scenario Details */}
          <div className="space-y-4">
            {/* Use Case */}
            <div className="bg-slate-900 border border-slate-700 rounded-lg p-4">
              <p className="text-sm text-slate-300">
                <span className="font-bold text-cyan-400">Use Case: </span>
                {scenario.use_case}
              </p>
            </div>

            {/* Settings Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Scale */}
              <div className="bg-slate-900 border border-slate-700 rounded-lg p-4 hover:border-orange-500/50 transition-colors">
                <p className="text-xs text-slate-500 mb-2">SCALE</p>
                <div className="flex items-center gap-2">
                  <code className="bg-slate-950 px-3 py-2 rounded text-sm text-orange-300 font-mono flex-1">
                    {scenario.settings.scale}
                  </code>
                  <button
                    onClick={() => handleCopy(scenario.settings.scale)}
                    className="p-2 hover:bg-slate-800 rounded transition-colors text-slate-400 hover:text-orange-400"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                </div>
                <p className="text-xs text-slate-400 mt-2">
                  {scenario.settings.scale === '0.1'
                    ? '✓ Correct (matches import)'
                    : 'Must be 0.1 for FO4'}
                </p>
              </div>

              {/* Export Animation Toggle */}
              <div className="bg-slate-900 border border-slate-700 rounded-lg p-4">
                <p className="text-xs text-slate-500 mb-2">EXPORT ANIMATION</p>
                <div
                  className={`px-4 py-2 rounded text-center font-bold transition-colors ${
                    scenario.settings.export_animation
                      ? 'bg-green-500/20 text-green-400 border border-green-500/50'
                      : 'bg-slate-950 text-slate-400 border border-slate-700'
                  }`}
                >
                  {scenario.settings.export_animation ? '✓ ON (Checked)' : '✗ OFF (Unchecked)'}
                </div>
              </div>

              {/* Export Skeleton Toggle */}
              <div className="bg-slate-900 border border-slate-700 rounded-lg p-4">
                <p className="text-xs text-slate-500 mb-2">EXPORT SKELETON</p>
                <div
                  className={`px-4 py-2 rounded text-center font-bold transition-colors ${
                    scenario.settings.export_skeleton
                      ? 'bg-green-500/20 text-green-400 border border-green-500/50'
                      : 'bg-slate-950 text-slate-400 border border-slate-700'
                  }`}
                >
                  {scenario.settings.export_skeleton ? '✓ ON (Checked)' : '✗ OFF (Unchecked)'}
                </div>
              </div>

              {/* Export Mesh Toggle */}
              <div className="bg-slate-900 border border-slate-700 rounded-lg p-4">
                <p className="text-xs text-slate-500 mb-2">EXPORT MESH</p>
                <div
                  className={`px-4 py-2 rounded text-center font-bold transition-colors ${
                    scenario.settings.export_mesh
                      ? 'bg-green-500/20 text-green-400 border border-green-500/50'
                      : 'bg-slate-950 text-slate-400 border border-slate-700'
                  }`}
                >
                  {scenario.settings.export_mesh ? '✓ ON (Checked)' : '✗ OFF (Unchecked)'}
                </div>
              </div>

              {/* Only Selected Toggle */}
              <div className="bg-slate-900 border border-slate-700 rounded-lg p-4">
                <p className="text-xs text-slate-500 mb-2">ONLY SELECTED</p>
                <div
                  className={`px-4 py-2 rounded text-center font-bold transition-colors ${
                    scenario.settings.only_selected
                      ? 'bg-green-500/20 text-green-400 border border-green-500/50'
                      : 'bg-slate-950 text-slate-400 border border-slate-700'
                  }`}
                >
                  {scenario.settings.only_selected ? '✓ ON (Checked)' : '✗ OFF (Unchecked)'}
                </div>
              </div>

              {/* Animation Name (if applicable) */}
              {scenario.settings.animation_name && (
                <div className="bg-slate-900 border border-slate-700 rounded-lg p-4">
                  <p className="text-xs text-slate-500 mb-2">ANIMATION NAME</p>
                  <div className="flex items-center gap-2">
                    <code className="bg-slate-950 px-3 py-2 rounded text-sm text-blue-300 font-mono flex-1">
                      {scenario.settings.animation_name}
                    </code>
                    <button
                      onClick={() => handleCopy(scenario.settings.animation_name || '')}
                      className="p-2 hover:bg-slate-800 rounded transition-colors text-slate-400 hover:text-blue-400"
                    >
                      {copiedSetting === scenario.settings.animation_name ? (
                        <CheckCircle2 className="w-4 h-4 text-green-400" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                  <p className="text-xs text-slate-400 mt-2">Example: idle, walk_forward, attack_left</p>
                </div>
              )}
            </div>

            {/* Pre-Export Checklist */}
            <div className="bg-slate-900 border border-green-700/30 rounded-lg p-6">
              <h3 className="font-bold text-green-400 mb-4 flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5" />
                Pre-Export Checklist
              </h3>
              <div className="space-y-2">
                {scenario.checklist.map((item, idx) => (
                  <div key={idx} className="flex gap-3 text-sm text-slate-300">
                    <span className="text-green-400 font-bold">{item.substring(0, 1)}</span>
                    <span>{item.substring(2)}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Common Mistakes for This Scenario */}
            <div className="bg-red-900/10 border border-red-700/30 rounded-lg p-6">
              <h3 className="font-bold text-red-400 mb-4 flex items-center gap-2">
                <AlertCircle className="w-5 h-5" />
                Common Mistakes in This Scenario
              </h3>
              <div className="space-y-2">
                {scenario.common_mistakes.map((mistake, idx) => (
                  <div key={idx} className="flex gap-2 text-sm text-red-200">
                    <span className="text-red-400 flex-shrink-0">•</span>
                    <span>{mistake}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Master Mistakes List */}
          <div className="space-y-4 pt-6 border-t border-slate-700">
            <h2 className="text-lg font-bold text-white">Master Mistake Reference</h2>
            <div className="space-y-3">
              {commonMistakes.map((mistake) => (
                <div
                  key={mistake.id}
                  className="bg-slate-900 border border-slate-700 rounded-lg overflow-hidden hover:border-red-500/50 transition-colors"
                >
                  <button
                    onClick={() =>
                      setExpandedMistake(
                        expandedMistake === mistake.id ? '' : mistake.id
                      )
                    }
                    className="w-full px-6 py-4 flex items-center gap-4 hover:bg-slate-800/50 transition-colors text-left"
                  >
                    <span className="text-2xl">{mistake.icon}</span>
                    <div className="flex-1">
                      <h4 className="font-bold text-red-300">{mistake.title}</h4>
                      <p className="text-xs text-slate-400">Symptom: {mistake.symptom}</p>
                    </div>
                    <ChevronDown
                      className={`w-5 h-5 text-slate-500 transition-transform ${
                        expandedMistake === mistake.id ? 'rotate-180' : ''
                      }`}
                    />
                  </button>

                  {expandedMistake === mistake.id && (
                    <div className="px-6 py-4 bg-slate-950/50 border-t border-slate-700 space-y-3">
                      <div>
                        <p className="text-xs text-slate-500 font-bold mb-1">CAUSE</p>
                        <p className="text-sm text-slate-300">{mistake.cause}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500 font-bold mb-1">FIX</p>
                        <p className="text-sm text-green-300">{mistake.fix}</p>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="p-4 bg-orange-900/20 border-t border-slate-700 text-xs text-orange-300">
        💡 Pro Tip: Bookmark this page! Reference it every time you export. Most failures are due to wrong scale or wrong checkboxes.
      </div>
    </div>
  );
};
