import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ToolsInstallVerifyPanel } from './components/ToolsInstallVerifyPanel';
import { openExternal } from './utils/openExternal';
import { SkeletonReference } from './SkeletonReference';
import { CustomRiggingChecklist } from './CustomRiggingChecklist';
import { ExportSettingsHelper } from './ExportSettingsHelper';
import { RiggingMistakesGallery } from './RiggingMistakesGallery';
import { AnimationValidator } from './AnimationValidator';
import HavokGuide from './HavokGuide';
import HavokQuickStartGuide from './HavokQuickStartGuide';
import HavokFallout4Guide from './HavokFallout4Guide';
import {
  BookOpen,
  ChevronDown,
  CheckCircle,
  AlertCircle,
  Zap,
  FileCode,
  ExternalLink,
} from 'lucide-react';

type SectionAction = {
  label: string;
  externalUrl?: string;
};

type Section = {
  id: string;
  title: string;
  icon: React.ReactNode;
  content: string;
  actions?: SectionAction[];
  steps?: string[];
};

type PipelineStep = {
  id: string;
  title: string;
  description: string;
  sectionIds: string[];
  blocks?: React.ReactNode[];
};

const openUrl = (url: string) => {
  void openExternal(url);
};

export const BlenderAnimationGuide: React.FC = () => {
  const [expandedStep, setExpandedStep] = useState<string>('reference');

  const sections: Section[] = [
    {
      id: 'overview',
      title: 'Fallout 4 Animation Pipeline Overview (2026 Standards)',
      icon: <BookOpen className="w-5 h-5" />,
      content:
        `A practical, modern FO4 animation pipeline is:\n\n` +
        `1) Blender (authoring) → create/clean keys + annotations\n` +
        `2) Havok Content Tools 2014 → convert FBX → HKX (FO4 2010.2.0-r1)\n` +
        `3) HKXPackUI → pack/inspect as needed\n\n` +
        `Key constraint: do NOT rename deform bones on vanilla skeletons.\n` +
        `FPS note: FO4 humanoid animations are commonly 30 FPS, but the safe rule is “match the vanilla animation you’re targeting” and keep Blender + Havok consistent.\n` +
        `Scale note: pick a single unit/scale convention and keep it consistent end-to-end (don’t mix 1.0 and 0.1 mid-pipeline).`,
      actions: [],
      steps: [
        'Extract a vanilla animation you want to match (path + naming + FPS reference)',
        'Import FO4 skeleton into Blender (don’t rename bones)',
        'Animate in Pose mode; keep Root stable unless you know why you’re moving it',
        'Export FBX with Only Deform Bones + baked animation',
        'Convert FBX → HKX using Havok 2010.2.0-r1 profile',
        'Test in-game early (loose files first, then BA2)',
      ],
    },
    {
      id: 'import-skeleton',
      title: 'Importing FO4 Skeleton into Blender',
      icon: <Zap className="w-5 h-5" />,
      content:
        `Import steps (PyNifly workflow):\n\n` +
        `1) File → Import → NetImmerse/Gamebryo (.nif)\n` +
        `2) Choose the skeleton NIF (example: Data\\Meshes\\Actors\\Character\\_Skeleton.nif)\n` +
        `3) Verify you got a full bone hierarchy with intact names\n\n` +
        `If your export ends up too big/small in-game: revisit unit scale + FBX export scale together (as a pair).`,
      actions: [
        {
          label: 'Search Nexus: PyNifly',
          externalUrl: 'https://www.nexusmods.com/fallout4/search/?gsearch=PyNifly&gsearchtype=mods',
        },
      ],
      steps: [
        'Install PyNifly add-on in Blender Preferences → Add-ons',
        'Restart Blender (if needed) and confirm NIF import appears',
        'Import the FO4 skeleton NIF',
        'Verify bone names were preserved exactly',
        'Save a clean “skeleton_only.blend” as your base file',
      ],
    },
    {
      id: 'bone-hierarchy',
      title: 'Understanding FO4 Bone Hierarchy',
      icon: <FileCode className="w-5 h-5" />,
      content:
        `FO4 skeleton structure (simplified):\n\n` +
        `ROOT\n` +
        `├─ NPC Root [NPC:\\_0]\n` +
        `├─ Pelvis → Spine… → Neck → Head\n` +
        `├─ L_Shoulder → L_Upperarm → L_Forearm → L_Hand\n` +
        `└─ R_Shoulder → R_Upperarm → R_Forearm → R_Hand\n\n` +
        `Key points:\n` +
        `• Bone names are case-sensitive\n` +
        `• Adding/renaming bones is a common export/in-game failure source\n` +
        `• Root vs NPC Root: be deliberate about which one carries motion`,
      actions: [],
      steps: [
        'Open the Outliner and expand the armature hierarchy',
        'Confirm there are no accidental extra bones',
        'If you must constrain bones, do it in a way that doesn’t rename deform bones',
      ],
    },
    {
      id: 'custom-rigging',
      title: 'Custom Skeletal Rigging (Advanced)',
      icon: <AlertCircle className="w-5 h-5" />,
      content:
        `For armor/clothing/custom bodies, FO4 typically expects you to bind meshes to existing bones.\n\n` +
        `Workflow:\n` +
        `• Import the FO4 skeleton\n` +
        `• Add your mesh\n` +
        `• Add an Armature modifier pointing at the FO4 skeleton\n` +
        `• Parent (Ctrl+P) with armature deformation\n` +
        `• Weight paint and test in Pose mode\n\n` +
        `Avoid: creating new deform bones (often breaks export / in-game expectations).`,
      steps: [
        'Import skeleton and mesh',
        'Ctrl+P → With Armature Deformation',
        'Weight paint and normalize weights',
        'Test by posing arms/legs and checking deformation',
        'Export a quick NIF/FBX test and validate in your pipeline',
      ],
    },
    {
      id: 'animation-creation',
      title: 'Creating Animations',
      icon: <CheckCircle className="w-5 h-5" />,
      content:
        `Step-by-step animation workflow:\n\n` +
        `1) Set scene FPS to match your target animation (commonly 30 FPS).\n` +
        `2) Pose mode on the armature; keyframe transforms.\n` +
        `3) Use Pose Markers for events/annotations where your pipeline supports it.\n\n` +
        `Common pitfall: animating the wrong root bone and getting in-game offsets.\n` +
        `Rule of thumb: keep ROOT stable unless you’re intentionally driving world motion.`,
      actions: [],
      steps: [
        'Set timeline range (start/end) for your clip',
        'Set Output → FPS to match the target',
        'Pose + keyframe; keep curves clean (avoid accidental spikes)',
        'If looping: ensure first/last frames match or blend cleanly',
        'Add Pose Markers for key events (impacts, footsteps)',
      ],
    },
    {
      id: 'nif-export',
      title: 'Exporting to HKX/NIF',
      icon: <Zap className="w-5 h-5" />,
      content:
        `Export/conversion overview:\n\n` +
        `1) Export FBX from Blender\n` +
        `   ✓ Bake animation\n` +
        `   ✓ Only Deform Bones\n` +
        `   ✓ Use a consistent scale convention\n\n` +
        `2) Import FBX into Havok Content Tools 2014\n` +
        `3) Export HKX using the FO4 2010.2.0-r1 profile\n\n` +
        `If Havok import fails, try a different FBX export variant/version and re-export.`,
      actions: [
        {
          label: 'Search Nexus: HKXPackUI',
          externalUrl: 'https://www.nexusmods.com/fallout4/search/?gsearch=HKXPackUI&gsearchtype=mods',
        },
      ],
      steps: [
        'Export FBX from Blender with baked animation',
        'Confirm only the intended bones are exported',
        'Convert FBX → HKX in Havok using FO4 profile',
        'Inspect HKX (and annotations/events) in HKXPackUI',
      ],
    },
    {
      id: 'integration',
      title: 'Integrating Animations Into Fallout 4 (Minimum Working Path)',
      icon: <FileCode className="w-5 h-5" />,
      content:
        `There are multiple ways to get animations “working” in FO4.\n\n` +
        `Fastest reliable test path: an animation replacer (same file name + same relative folder path as the vanilla HKX).\n\n` +
        `Brand-new animations usually require behavior/graph work. Use the Havok FO4 Guide for behavior graph context.`,
      actions: [],
      steps: [
        'Extract a vanilla HKX and note its full relative path under Data\\Meshes\\...',
        'Export/convert your animation to HKX',
        'Place your HKX at the same relative path (loose files for iteration)',
        'Test in-game; if speed is wrong, fix FPS at source and rebuild HKX',
        'When stable, package into BA2 and retest',
      ],
    },
    {
      id: 'validation',
      title: 'Validation Checklist',
      icon: <CheckCircle className="w-5 h-5" />,
      content:
        `Before testing in Fallout 4, verify:\n\n` +
        `✓ Bone names match the target skeleton (case-sensitive)\n` +
        `✓ No accidental extra bones exported\n` +
        `✓ Scale is consistent across import/export\n` +
        `✓ FPS matches the target animation\n` +
        `✓ HKX built with FO4 2010.2.0-r1 profile`,
      actions: [],
      steps: [
        'Run the in-app Animation Validator first',
        'Fix weight normalization and naming issues before conversion',
        'Inspect HKX for expected annotations/events (if used)',
        'Test in-game with a controlled scenario',
      ],
    },
    {
      id: 'common-errors',
      title: 'Common Errors & Solutions',
      icon: <AlertCircle className="w-5 h-5" />,
      content:
        `Problem: Animation plays too fast/slow\n` +
        `Fix: Blender FPS and conversion settings don’t match the target; re-bake and rebuild HKX.\n\n` +
        `Problem: Mesh explodes or stretches\n` +
        `Fix: weights/bones mismatch; normalize weights; export only intended deform bones.\n\n` +
        `Problem: T-pose in-game\n` +
        `Fix: skeleton mismatch or missing expected data; verify names and hierarchy.\n\n` +
        `Problem: Havok FBX import fails\n` +
        `Fix: try a different FBX export variant/version and re-export from Blender.`,
    },
    {
      id: 'tools',
      title: 'Required Production Tools (2026)',
      icon: <Zap className="w-5 h-5" />,
      content:
        `Tools you’ll typically need, plus “install/verify” checks:\n\n` +
        `1) Blender (authoring)\n` +
        `   Verify: Blender launches; you can save a .blend.\n\n` +
        `2) PyNifly (NIF import/export in Blender)\n` +
        `   Verify: NIF import/export entries show up in Blender.\n\n` +
        `3) Havok Content Tools 2014 (FBX → HKX)\n` +
        `   Verify: you can import your FBX and export HKX using the FO4 profile.\n\n` +
        `4) HKXPackUI (inspect/pack as needed)\n` +
        `   Verify: HKX opens; you can view annotations/events.\n\n` +
        `5) BAE (extract vanilla references)\n` +
        `   Verify: you can extract a BA2 and browse the output.\n\n` +
        `Link policy: use Nexus searches for community tools (versions move), and avoid hardcoding uncertain URLs.`,
      actions: [
        { label: 'Blender Download', externalUrl: 'https://www.blender.org/download/' },
        {
          label: 'Search Nexus: PyNifly',
          externalUrl: 'https://www.nexusmods.com/fallout4/search/?gsearch=PyNifly&gsearchtype=mods',
        },
        {
          label: 'Search Nexus: HKXPackUI',
          externalUrl: 'https://www.nexusmods.com/fallout4/search/?gsearch=HKXPackUI&gsearchtype=mods',
        },
        {
          label: 'Search Nexus: BAE',
          externalUrl: 'https://www.nexusmods.com/fallout4/search/?gsearch=BAE&gsearchtype=mods',
        },
      ],
      steps: [
        'Install Blender and confirm it runs',
        'Install PyNifly and confirm NIF import/export shows',
        'Set up conversion tooling and validate on a tiny test clip',
        'Extract vanilla references (skeleton + a vanilla HKX target)',
      ],
    },
  ];

  const sectionById = (id: string) => sections.find((section) => section.id === id);

  const renderSectionBlock = (id: string) => {
    const section = sectionById(id);
    if (!section) return null;

    return (
      <div
        key={section.id}
        className="bg-slate-900 border border-slate-700 rounded-lg overflow-hidden"
      >
        <div className="px-5 py-4 flex items-center gap-3 border-b border-slate-800">
          <div className="text-cyan-400">{section.icon}</div>
          <h3 className="font-semibold text-white text-base">{section.title}</h3>
        </div>
        <div className="px-5 py-4 bg-slate-950/40">
          <div className="text-sm text-slate-300 whitespace-pre-wrap mb-4">{section.content}</div>

          {section.actions && section.actions.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-4">
              {section.actions.map((action) => (
                <button
                  key={action.label}
                  onClick={() => {
                    if (action.externalUrl) {
                      void openUrl(action.externalUrl);
                    }
                  }}
                  className="px-3 py-1.5 text-xs rounded bg-slate-900 border border-slate-700 text-slate-200 hover:border-cyan-500/50 hover:bg-slate-800 transition-colors inline-flex items-center gap-2"
                >
                  {action.label}
                  {action.externalUrl ? <ExternalLink className="w-3.5 h-3.5 text-slate-400" /> : null}
                </button>
              ))}
            </div>
          )}

          {section.steps && section.steps.length > 0 && (
            <div className="mt-4 pt-4 border-t border-slate-700">
              <h4 className="font-semibold text-white mb-3 flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-400" />
                Step-by-Step
              </h4>
              <ol className="space-y-2">
                {section.steps.map((step, idx) => (
                  <li key={idx} className="flex gap-3 text-sm">
                    <span className="text-cyan-400 font-bold flex-shrink-0">
                      {String(idx + 1).padStart(2, '0')}
                    </span>
                    <span className="text-slate-300">{step}</span>
                  </li>
                ))}
              </ol>
            </div>
          )}
        </div>
      </div>
    );
  };

  const pipelineSteps: PipelineStep[] = [
    {
      id: 'reference',
      title: 'Reference & Skeleton',
      description: 'Establish the correct FO4 skeleton, hierarchy, and base reference files before any rigging or animation work.',
      sectionIds: ['overview', 'import-skeleton', 'bone-hierarchy'],
      blocks: [
        <SkeletonReference key="skeleton-reference" embedded />,
      ],
    },
    {
      id: 'rigging',
      title: 'Rigging & Weighting',
      description: 'Bind your meshes to the FO4 skeleton and verify weights before you animate.',
      sectionIds: ['custom-rigging'],
      blocks: [
        <CustomRiggingChecklist key="rigging-checklist" embedded />,
        <RiggingMistakesGallery key="rigging-mistakes" embedded />,
      ],
    },
    {
      id: 'animation',
      title: 'Animation Authoring',
      description: 'Animate with consistent FPS, stable roots, and clean keyframes.',
      sectionIds: ['animation-creation'],
    },
    {
      id: 'export',
      title: 'Export & HKX Conversion',
      description: 'Export clean FBX/NIF data and convert to FO4 HKX using the correct Havok profile.',
      sectionIds: ['nif-export', 'tools'],
      blocks: [
        <ExportSettingsHelper key="export-settings" embedded />,
        <HavokQuickStartGuide key="havok-quick-start" embedded />,
        <HavokGuide key="havok-guide" embedded />,
        <HavokFallout4Guide key="havok-fo4" embedded />,
      ],
    },
    {
      id: 'validate',
      title: 'Validate & Ship',
      description: 'Validate your data, test in-game, then package safely.',
      sectionIds: ['validation', 'integration', 'common-errors'],
      blocks: [
        <AnimationValidator key="animation-validator" embedded />,
      ],
    },
  ];

  return (
    <div className="h-full bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 overflow-hidden flex flex-col">
      <div className="p-6 border-b border-slate-700 bg-slate-800/50">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <BookOpen className="w-8 h-8 text-cyan-400" />
            <div>
              <h1 className="text-2xl font-bold text-white">Animation Pipeline (All-in-One)</h1>
              <p className="text-sm text-slate-400">Reference, rigging, animation, export, and validation in one ordered flow</p>
            </div>
          </div>
          <Link
            to="/reference"
            className="px-3 py-2 border border-cyan-500/30 text-[10px] font-black uppercase tracking-widest text-cyan-200 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 transition-colors"
          >
            Help
          </Link>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-4xl mx-auto space-y-3">
          <ToolsInstallVerifyPanel
            accentClassName="text-cyan-300"
            description="This page is a pipeline guide. Use the tools list + a tiny test clip to confirm your install and scale before you build a full animation set."
            tools={[
              { label: 'Blender (official download)', href: 'https://www.blender.org/download/', kind: 'official' },
              { label: 'Nexus search: PyNifly', href: 'https://www.nexusmods.com/fallout4/search/?gsearch=PyNifly&gsearchtype=mods', kind: 'search', note: 'NIF import/export add-on used by this guide.' },
              { label: 'Nexus search: HKXPackUI', href: 'https://www.nexusmods.com/fallout4/search/?gsearch=HKXPackUI&gsearchtype=mods', kind: 'search', note: 'For inspecting/packing HKX files (optional).' },
              { label: 'Nexus search: BAE', href: 'https://www.nexusmods.com/fallout4/search/?gsearch=BAE&gsearchtype=mods', kind: 'search', note: 'Bethesda Archive Extractor (reference extraction).' },
            ]}
            verify={[
              'Expand “Step 1: Reference & Skeleton” and confirm the pipeline sections open without layout jumps.',
              'Confirm Blender can import the FO4 skeleton and the bone names are unchanged (case-sensitive).',
              'Export a tiny 10–30 frame FBX and confirm it contains animation keyframes.'
            ]}
            firstTestLoop={[
              'Import skeleton → animate 1 bone for ~20 frames → export FBX.',
              'Convert FBX → FO4 HKX using your chosen toolchain → inspect/pack if needed.',
              'Test in-game as loose files first; only then package to BA2.'
            ]}
            troubleshooting={[
              'If the in-game scale is wrong, fix Blender unit scale + FBX export scale together (don’t “half-fix” one side).',
              'If animations do nothing in-game, verify bone names were not renamed and the target skeleton matches.'
            ]}
          />

          {pipelineSteps.map((step, index) => (
            <div
              key={step.id}
              className="bg-slate-900 border border-slate-700 rounded-lg overflow-hidden hover:border-cyan-500/50 transition-colors"
            >
              <button
                onClick={() => setExpandedStep(expandedStep === step.id ? '' : step.id)}
                className="w-full px-6 py-4 flex items-center gap-4 hover:bg-slate-800/50 transition-colors text-left"
              >
                <div className="text-cyan-400 flex-shrink-0 text-xs font-black rounded-full border border-cyan-400/40 px-2 py-1">
                  Step {index + 1}
                </div>
                <div className="flex-1">
                  <h2 className="font-bold text-white text-lg">{step.title}</h2>
                  <p className="text-xs text-slate-400 mt-1">{step.description}</p>
                </div>
                <ChevronDown
                  className={`w-5 h-5 text-slate-500 transition-transform ${
                    expandedStep === step.id ? 'rotate-180' : ''
                  }`}
                />
              </button>

              {expandedStep === step.id && (
                <div className="px-6 py-5 bg-slate-950/50 border-t border-slate-700 space-y-5">
                  {step.sectionIds.map(renderSectionBlock)}

                  {step.blocks && step.blocks.length > 0 && (
                    <div className="space-y-5">
                      {step.blocks.map((block, blockIndex) => (
                        <div
                          key={`${step.id}-block-${blockIndex}`}
                          className="rounded-lg overflow-hidden border border-slate-700"
                        >
                          {block}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="p-4 bg-cyan-900/20 border-t border-slate-700">
        <p className="text-xs text-cyan-300">
          💡 Pro Tip: Start with simple looping idle animations before attempting complex combat animations. Practice
          the pipeline with vanilla animations first.
        </p>
      </div>
    </div>
  );
};
