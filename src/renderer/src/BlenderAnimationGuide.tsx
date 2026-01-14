import React, { useState } from 'react';
import { BookOpen, ChevronDown, CheckCircle, AlertCircle, Zap, FileCode } from 'lucide-react';

interface Section {
  id: string;
  title: string;
  icon: React.ReactNode;
  content: string;
  steps?: string[];
}

export const BlenderAnimationGuide: React.FC = () => {
  const [expandedSection, setExpandedSection] = useState<string>('overview');

  const sections: Section[] = [
    {
      id: 'overview',
      title: 'Fallout 4 Animation Pipeline Overview (2026 Standards)',
      icon: <BookOpen className="w-5 h-5" />,
      content: `The modern Fallout 4 animation pipeline uses Blender 4.1+: \n\n1. Blender (4.1+) → Animation creation using PyNifly or FBX\n2. Havok Content Tools 2014 → Build HKX (2010.2.0-r1)\n3. HKXPackUI → Pack for Fallout 4\n\nKey constraint: Do NOT rename deform bones in vanilla skeletons.\nKey requirement: All animations must be 30 FPS for correct game playback.`,
      steps: [
        'Import FO4 skeleton rig into Blender via PyNifly',
        'Create animation at 30 FPS',
        'Annotate events with Pose Markers',
        'Export as FBX with Only Deform Bones',
        'Build HKX for FO4 2010.2.0-r1 profile'
      ]
    },
    {
      id: 'import-skeleton',
      title: 'Importing FO4 Skeleton into Blender',
      icon: <Zap className="w-5 h-5" />,
      content: `Steps to import the Fallout 4 skeleton:\n\n1. Tool: Use PyNifly (latest release)\n2. Process:\n   - File → Import → NetImmerse/Gamebryo (.nif)\n   - Select skeleton NIF from Data\\Meshes\\Actors\\Character\\_Skeleton.nif\n   - Set Scale: 1.0 (PyNifly uses Meters natively)\n\n3. Result: Full skeleton with bone names and constraints\n\nCommon issue: Using 0.1 scale with modern exporters. Stick to 1.0 (Meters) for Blender 4.x.`,
      steps: [
        'Download and install PyNifly Blender plugin',
        'Navigate to FO4 data\\meshes\\actors\\character',
        'File → Import → NIF',
        'Select skeleton.nif',
        'Verify scale setting: 1.0 (Meters)',
        'Import and confirm all bones (Root, COM, Pelvis, etc.)'
      ]
    },
    {
      id: 'bone-hierarchy',
      title: 'Understanding FO4 Bone Hierarchy',
      icon: <FileCode className="w-5 h-5" />,
      content: `FO4 skeleton structure (critical for rigging):\n\nROOT\n├─ NPC Root [NPC:\\_0]\n├─ Pelvis\n│  ├─ Spine1\n│  ├─ Spine2\n│  ├─ Chest\n│  │  ├─ Neck\n│  │  │  └─ Head\n│  │  ├─ L_Shoulder → L_Upperarm → L_Forearm → L_Hand\n│  │  └─ R_Shoulder → R_Upperarm → R_Forearm → R_Hand\n├─ L_Thigh → L_Calf → L_Foot\n├─ R_Thigh → R_Calf → R_Foot\n\nKey points:\n• 60+ bones total (including fingers, toes, facial bones)\n• Pelvis is parent to all upper body\n• Root bone should NOT animate (world anchor)\n• NPC Root drives character movement\n• Every bone name must match EXACTLY (case-sensitive)`,
      steps: [
        'Open skeleton in Blender',
        'Switch to Outliner view',
        'Expand hierarchy fully',
        'Verify bone names match FO4 standard',
        'Check for extra/missing bones',
        'Note: Custom bones will cause export errors'
      ]
    },
    {
      id: 'custom-rigging',
      title: 'Custom Skeletal Rigging (Advanced)',
      icon: <AlertCircle className="w-5 h-5" />,
      content: `For custom character rigs (armor, clothing, custom bodies):\n\n1. DO NOT create new bones - FO4 won't recognize them\n2. Instead: Parent your geometry to EXISTING bones\n\nProcess:\n   a) Import FO4 skeleton\n   b) Add your custom mesh (armor/body/cloth)\n   c) Enable Armature modifier on mesh\n   d) Set armature target: FO4 Skeleton\n   e) Parent mesh to armature (Ctrl+P → With Armature Deformation)\n   f) Weight paint: assign vertices to bones\n\n3. Weight painting:\n   - Switch to Weight Paint mode\n   - Select each bone and paint influence\n   - Use soft brush for smooth deformation\n   - Avoid creating hard edges (exception: sharp armor seams)\n   - Test: Rotate bones in Pose mode to verify deformation\n\n4. Common mistake: Forgetting to remove duplicate bone constraints → causes export errors`,
      steps: [
        'Import skeleton AND your custom mesh',
        'Select mesh, then skeleton (Shift+click)',
        'Ctrl+P → With Armature Deformation',
        'Switch to Weight Paint mode',
        'Select each bone group (Left arm, Right arm, etc.)',
        'Paint weights (green = full influence, blue = no influence)',
        'Test in Pose mode by rotating bones',
        'Refine weights until satisfied',
        'Verify no bones added to skeleton'
      ]
    },
    {
      id: 'animation-creation',
      title: 'Creating Animations',
      icon: <CheckCircle className="w-5 h-5" />,
      content: `Step-by-step animation workflow:\n\n1. Setup:\n   - Import skeleton (already rigged)\n   - Set timeline length: Your animation duration (e.g., 90 frames = 3.0 sec at 30fps)\n   - Frame rate: Set to 30 fps (Fallout 4 Standard)\n\n2. Keyframing:\n   - Select armature (not mesh)\n   - Switch to Pose mode (Tab)\n   - Rotate bones to create keyframes\n   - Press 'i' to insert keyframe at each pose\n\n3. Annotations:\n   - Add Pose Markers (Shift+Alt+M) for annotations\n   - Common: "Hit" for impact, "FootstepL" for audio\n\n4. Common pitfall: Animating root bone → will offset character position in-game.\n   Solution: Animate NPC Root for movement, keep Root at origin.`,
      steps: [
        'Set timeline: 1 - [frame count]',
        'Set frame rate: 30 fps (Output → FPS: 30)',
        'Select armature, Tab to Pose mode',
        'Create poses and keyframe (I)',
        'Add Pose Markers for annotations',
        'Verify first and last frames match for loops'
      ]
    },
    {
      id: 'nif-export',
      title: 'Exporting to HKX/NIF',
      icon: <Zap className="w-5 h-5" />,
      content: `Exporting from Blender 4.1 to Fallout 4:\n\n1. Prep:\n   - Select Armature\n   - Ensure all keyframes are on deform bones\n\n2. Export process:\n   - File → Export → FBX (.fbx)\n   - Settings:\n     ✓ Only Deform Bones: YES\n     ✓ Bake Animation: YES\n     ✓ Scale: 1.0\n\n3. Havok Build:\n   - Open Havok Content Tools 2014\n   - File → Import FBX\n   - Filter: Export to HKX\n   - Profile: Fallout 4 (2010.2.0-r1)\n\n4. Verification:\n   - Open final HKX in HKXPackUI\n   - Check for annotation list`,
      steps: [
        'Select armature',
        'File → Export → FBX',
        'Check Only Deform Bones',
        'Open Havok Content Tools',
        'Build as HKX for FO4 profile',
        'Pack using HKXPackUI'
      ]
    },
    {
      id: 'validation',
      title: 'Validation Checklist',
      icon: <CheckCircle className="w-5 h-5" />,
      content: `Before importing into Fallout 4, verify:\n\n✓ Bone names: Exact match to FO4 skeleton (case-sensitive)\n✓ No extra bones: Only deform bones exported\n✓ Scale: 1.0 (Meters)\n✓ Root bone: at 0,0,0\n✓ NPC Root: check for correct movement translation\n✓ Loop detection: First frame = last frame (if looping)\n✓ Frame rate: 30 fps\n✓ Weight painting: Normalization check (Sum = 1.0)\n✓ HKX Build: Using profile 2010.2.0-r1`,
      steps: [
        'Run Mossy Animation Validator',
        'Fix any weight normalization errors',
        'Export to FBX',
        'Check annotations in HKXPackUI',
        'Test in-game on actual character'
      ]
    },
    {
      id: 'common-errors',
      title: 'Common Errors & Solutions',
      icon: <AlertCircle className="w-5 h-5" />,
      content: `Problem: Animation plays too fast/slow\nSolution: Check scene FPS. FO4 expects 30 FPS. Re-bake animations at 30 FPS.\n\nProblem: Mesh explodes or stretches\nSolution: Weight normalization error or extra bones. Ensure sum of weights is 1.0 and export ONLY deform bones.\n\nProblem: Character stays static\nSolution: Missing annotations or incorrect HKX build profile. Use 2010.2.0-r1.\n\nProblem: T-Pose in-game\nSolution: Skeleton mismatch. Ensure armature wasn't renamed and bone hierarchy is intact.\n\nProblem: FBX Import fails in Havok\nSolution: Use Binary FBX 2014/2015 format instead of ASCII.`
    },
    {
      id: 'tools',
      title: 'Required Production Tools (2026)',
      icon: <Zap className="w-5 h-5" />,
      content: `Essential tools for modern FO4 modding:\n\n1. Blender 4.1+\n   - Support for modern geometry and PBR workflows.\n\n2. PyNifly Blender Add-on\n   - Best-in-class NIF import/export for modern Blender.\n\n3. Havok Content Tools 2014 (64-bit)\n   - Required for converting FBX to HKX animations.\n\n4. HKXPackUI\n   - Required for packing animations into the final format.\n\n5. BAE (Bethesda Archive Extractor)\n   - For extracting vanilla assets to use as references.`,
      steps: [
        'Install Blender 4.1+',
        'Enable PyNifly in Preferences',
        'Set up Havok Content Tools paths',
        'Extract skeleton.nif for reference',
        'Begin first project at 30 FPS'
      ]
    }
  ];

  return (
    <div className="h-full bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 overflow-hidden flex flex-col">
      {/* Header */}
      <div className="p-6 border-b border-slate-700 bg-slate-800/50">
        <div className="flex items-center gap-3">
          <BookOpen className="w-8 h-8 text-cyan-400" />
          <div>
            <h1 className="text-2xl font-bold text-white">Blender Animation & Rigging Guide</h1>
            <p className="text-sm text-slate-400">Complete pipeline for custom Fallout 4 animations</p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-4xl mx-auto space-y-3">
          {sections.map((section) => (
            <div
              key={section.id}
              className="bg-slate-900 border border-slate-700 rounded-lg overflow-hidden hover:border-cyan-500/50 transition-colors"
            >
              <button
                onClick={() => setExpandedSection(expandedSection === section.id ? '' : section.id)}
                className="w-full px-6 py-4 flex items-center gap-4 hover:bg-slate-800/50 transition-colors text-left"
              >
                <div className="text-cyan-400 flex-shrink-0">{section.icon}</div>
                <div className="flex-1">
                  <h2 className="font-bold text-white text-lg">{section.title}</h2>
                </div>
                <ChevronDown
                  className={`w-5 h-5 text-slate-500 transition-transform ${
                    expandedSection === section.id ? 'rotate-180' : ''
                  }`}
                />
              </button>

              {expandedSection === section.id && (
                <div className="px-6 py-4 bg-slate-950/50 border-t border-slate-700">
                  <div className="text-sm text-slate-300 whitespace-pre-wrap mb-4">
                    {section.content}
                  </div>

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
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Footer Tip */}
      <div className="p-4 bg-cyan-900/20 border-t border-slate-700">
        <p className="text-xs text-cyan-300">
          💡 Pro Tip: Start with simple looping idle animations before attempting complex combat animations. Practice the pipeline with vanilla animations first.
        </p>
      </div>
    </div>
  );
};
