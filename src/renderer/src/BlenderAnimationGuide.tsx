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
      title: 'Fallout 4 Animation Pipeline Overview',
      icon: <BookOpen className="w-5 h-5" />,
      content: `The Fallout 4 animation pipeline requires specific workflows:\n\n1. Blender (3.x+) → Animation creation/rigging\n2. NifSkope → Export to NIF format\n3. Fallout 4 → In-engine testing\n\nKey constraint: FO4 uses a FIXED skeleton (you cannot add/remove bones)\nKey requirement: All animations must match FO4 skeleton EXACTLY`,
      steps: [
        'Import FO4 skeleton rig into Blender',
        'Create animation on the skeleton',
        'Validate bone hierarchy and names',
        'Export to NIF format via custom script',
        'Import into Fallout 4 and test'
      ]
    },
    {
      id: 'import-skeleton',
      title: 'Importing FO4 Skeleton into Blender',
      icon: <Zap className="w-5 h-5" />,
      content: `Steps to import the Fallout 4 skeleton:\n\n1. Source: Extract skeleton from vanilla game (usually CME_Rigging.nif)\n2. Tool: Use Better Blender 3 Add-on (B3DAN)\n3. Process:\n   - Install B3DAN Blender add-on\n   - File → Import → NetImmerse/Gamebryo (.nif)\n   - Select skeleton NIF from game files\n   - Set scale: 0.1 (FO4 uses 10x Blender scale)\n\n4. Result: Full skeleton with bone names, constraints, shape keys\n\nCommon issue: Importing at wrong scale causes animations to look stretched/compressed`,
      steps: [
        'Download Better Blender 3 add-on',
        'Enable add-on in Blender preferences',
        'Navigate to FO4 data\\meshes\\actors\\character (locate skeleton)',
        'File → Import → NIF',
        'Select skeleton.nif',
        'Verify scale setting: 0.1',
        'Import and confirm all 60+ bones present'
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
      content: `Step-by-step animation workflow:\n\n1. Setup:\n   - Import skeleton (already rigged)\n   - Set timeline length: Your animation duration (e.g., 60 frames = 2.5 sec at 24fps)\n   - Frame rate: Set to 24 fps (Fallout 4 standard)\n\n2. Keyframing:\n   - Select armature (not mesh)\n   - Switch to Pose mode (Tab)\n   - Rotate bones to create keyframes\n   - Press 'i' to insert keyframe at each pose\n   - Move to next frame (arrow key or frame number)\n   - Adjust bone rotation and keyframe again\n\n3. Loop handling:\n   - First frame should match last frame (for looping animations)\n   - Check your animation curves in Graph Editor\n   - Add ease-in/ease-out curves for smooth transitions\n\n4. Common pitfall: Animating root bone → will offset character position in-game\n   Solution: Only animate NPC Root or lower bones`,
      steps: [
        'Set timeline: 1 - [frame count]',
        'Set frame rate: 24 fps (Output → FPS: 24)',
        'Select armature, Tab to Pose mode',
        'Press Play to preview',
        'Create first pose',
        'Press \'i\' on each bone to insert keyframe',
        'Move timeline forward',
        'Adjust bones and keyframe again',
        'Repeat until animation complete',
        'For loop: make first frame = last frame',
        'Preview in timeline'
      ]
    },
    {
      id: 'nif-export',
      title: 'Exporting to NIF Format',
      icon: <Zap className="w-5 h-5" />,
      content: `Exporting animations from Blender to NIF:\n\n1. Prep:\n   - Select ONLY the armature (not the mesh)\n   - Make sure all keyframes are baked\n   - Check timeline: No timeline data outside animation range\n\n2. Export process:\n   - File → Export → NetImmerse/Gamebryo (.nif)\n   - Location: FO4 data\\meshes\\animations\\[modname]\n   - Settings:\n     ✓ Export animation: YES\n     ✓ Animation: [your_animation_name]\n     ✓ Scale: 0.1 (match import scale)\n     ✓ Export skeleton: NO (if exporting animation only)\n\n3. Naming:\n   - Animation filename should match bone groups\n   - Example: idle.nif, idle_happy.nif, attack_left.nif\n\n4. Verification:\n   - Open exported NIF in NifSkope\n   - Check animation list (NiAnimationData)\n   - Verify bone transforms exist\n   - Check no extra bones were included`,
      steps: [
        'Select armature only (deselect mesh)',
        'Bake all keyframes (Object → Bake Animation)',
        'File → Export → NIF',
        'Choose export directory',
        'Settings: Animation=YES, Scale=0.1',
        'Export',
        'Open in NifSkope to verify',
        'Check NiAnimationData node',
        'Test in-game'
      ]
    },
    {
      id: 'validation',
      title: 'Validation Checklist',
      icon: <CheckCircle className="w-5 h-5" />,
      content: `Before importing into Fallout 4, verify:\n\n✓ Bone names: Exact match to FO4 skeleton (case-sensitive)\n✓ No extra bones: Only 60+ original FO4 bones\n✓ Scale: All export at 0.1 scale\n✓ Root bone: Not animated (world anchor)\n✓ NPC Root: Drives movement only (not rotation)\n✓ Loop detection: First frame = last frame (if looping animation)\n✓ Frame rate: 24 fps\n✓ Keyframes: No gaps or floating keyframes outside range\n✓ Weight painting: No bones with zero influence on mesh\n✓ NIF export: Animation data present in NifSkope\n✓ File location: Correct path in Data\\Meshes\\Animations\\`,
      steps: [
        'Run validation tool (see Animation Validator)',
        'Fix any errors reported',
        'Export to NIF',
        'Open NIF in NifSkope',
        'Expand NiAnimationData',
        'Verify bone controllers exist',
        'Test in Creation Kit',
        'Test in-game on actual character'
      ]
    },
    {
      id: 'common-errors',
      title: 'Common Errors & Solutions',
      icon: <AlertCircle className="w-5 h-5" />,
      content: `Problem: Animation doesn't play in-game\nSolution: Check NifSkope for NiAnimationData node. If missing, re-export with "Export Animation = YES"\n\nProblem: Bones distort / mesh looks wrong\nSolution: Weight painting issue. Switch to Weight Paint mode, select problem bone, repaint influence smoothly\n\nProblem: Character moves wrong position\nSolution: You animated Root or NPC Root position. Only animate NPC Root rotation, not translation\n\nProblem: Animation loops badly (jerky transition)\nSolution: First frame ≠ last frame. Copy first frame pose to last frame\n\nProblem: NIF export fails\nSolution: Check for duplicate bone names or non-standard bones. Delete any custom bones added\n\nProblem: Missing bones in skeleton\nSolution: Re-import skeleton, ensure scale = 0.1. Some bones are children and not visible at root\n\nProblem: Animation is too fast/slow in-game\nSolution: Fallout 4 plays at 24 fps. If your animation is 30 fps, re-frame it to 24 fps`
    },
    {
      id: 'tools',
      title: 'Required Tools & Add-ons',
      icon: <Zap className="w-5 h-5" />,
      content: `Essential tools for FO4 animation rigging:\n\n1. Blender 3.x+ (free, open source)\n   - Download: blender.org\n   - Recommended: 3.6 LTS (stable)\n\n2. Better Blender 3 Add-on (B3DAN)\n   - Purpose: NIF import/export\n   - Download: Nexus Mods (search "Better Blender 3")\n   - Install: Extract to Blender\\scripts\\addons\n\n3. NifSkope (free)\n   - Purpose: Verify NIF structure\n   - Download: Nexus Mods\n   - Use: Open exported animations to validate\n\n4. Creation Kit (free, Bethesda)\n   - Purpose: In-editor animation testing\n   - Download: Steam (Fallout 4 Tools)\n   - Use: Import animation NIF, test on character\n\n5. Optional: Animation Validator (Mossy built-in)\n   - Checks for common rigging errors before export`,
      steps: [
        'Download Blender 3.6 LTS',
        'Install Better Blender 3 add-on',
        'Download NifSkope',
        'Download Creation Kit from Steam',
        'Set up project folder structure',
        'Create test animation'
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
