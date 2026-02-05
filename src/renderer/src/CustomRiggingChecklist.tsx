import React, { useState } from 'react';
import { CheckCircle2, ChevronDown, AlertCircle, Zap, BookOpen } from 'lucide-react';
import { ToolsInstallVerifyPanel } from './components/ToolsInstallVerifyPanel';

interface ChecklistPhase {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  items: {
    id: string;
    text: string;
    tip: string;
    completed: boolean;
  }[];
}

export const CustomRiggingChecklist: React.FC = () => {
  const [phases, setPhases] = useState<ChecklistPhase[]>([
    {
      id: 'setup',
      title: 'Project Setup',
      description: 'Prepare your Blender workspace and files',
      icon: <BookOpen className="w-5 h-5" />,
      items: [
        {
          id: 'setup-1',
          text: 'Create new Blender 3.x+ project',
          tip: 'Use 3.6 LTS for stability. Open new file, save as project_name.blend',
          completed: false,
        },
        {
          id: 'setup-2',
          text: 'Install Better Blender 3 Add-on (B3DAN)',
          tip: 'Go to Preferences > Add-ons > Install. Navigate to extracted B3DAN folder.',
          completed: false,
        },
        {
          id: 'setup-3',
          text: 'Enable B3DAN in preferences',
          tip: 'Search "Better Blender" in Add-ons, click checkbox to enable',
          completed: false,
        },
        {
          id: 'setup-4',
          text: 'Set render scale to 0.1',
          tip: 'Scene properties > Units > Scale: 0.1 (match FO4 scale)',
          completed: false,
        },
        {
          id: 'setup-5',
          text: 'Set frame rate to 24 fps',
          tip: 'Output properties > Frame Rate: 24',
          completed: false,
        },
        {
          id: 'setup-6',
          text: 'Create project folder structure',
          tip: 'Folder: animations, exports, imports, reference, textures',
          completed: false,
        },
      ],
    },
    {
      id: 'import',
      title: 'Import FO4 Skeleton',
      description: 'Load the Fallout 4 skeleton rig into Blender',
      icon: <Zap className="w-5 h-5" />,
      items: [
        {
          id: 'import-1',
          text: 'Locate FO4 skeleton NIF file',
          tip: 'Path: Fallout 4\\Data\\Meshes\\Actors\\Character\\* (CME_Rigging.nif or similar)',
          completed: false,
        },
        {
          id: 'import-2',
          text: 'File > Import > NetImmerse/Gamebryo (.nif)',
          tip: 'Use B3DAN importer, not standard FBX',
          completed: false,
        },
        {
          id: 'import-3',
          text: 'Verify import scale: 0.1',
          tip: 'Check import settings BEFORE importing. Scale should be 0.1.',
          completed: false,
        },
        {
          id: 'import-4',
          text: 'Verify all 60+ bones imported',
          tip: 'Outliner should show full hierarchy. Check for Root, Pelvis, all arms/legs',
          completed: false,
        },
        {
          id: 'import-5',
          text: 'Delete any unwanted meshes',
          tip: 'If skeleton came with body mesh, delete it. Keep ONLY armature.',
          completed: false,
        },
        {
          id: 'import-6',
          text: 'Save project',
          tip: 'Save as: project_skeleton_base.blend (backup)',
          completed: false,
        },
      ],
    },
    {
      id: 'character',
      title: 'Import Custom Character',
      description: 'Load your custom body/armor mesh into the scene',
      icon: <BookOpen className="w-5 h-5" />,
      items: [
        {
          id: 'char-1',
          text: 'Import your custom mesh (FBX/OBJ)',
          tip: 'File > Import > [format]. Position mesh roughly at origin.',
          completed: false,
        },
        {
          id: 'char-2',
          text: 'Scale custom mesh to match skeleton',
          tip: 'Mesh should align with skeleton. Use S key to scale, then press 0.1 or 10 to match',
          completed: false,
        },
        {
          id: 'char-3',
          text: 'Position mesh at origin (0, 0, 0)',
          tip: 'Use G key to move. Position feet at ground level, head up.',
          completed: false,
        },
        {
          id: 'char-4',
          text: 'Rotate mesh if needed (align forward direction)',
          tip: 'Character should face +Y direction. Use R > Z > 90 if needed.',
          completed: false,
        },
        {
          id: 'char-5',
          text: 'Apply all transforms (Ctrl+A > All Transforms)',
          tip: 'Critical! Clears position/rotation/scale. Do this BEFORE rigging.',
          completed: false,
        },
        {
          id: 'char-6',
          text: 'Select mesh, then skeleton (Shift+click)',
          tip: 'Order matters: MESH first, SKELETON second',
          completed: false,
        },
      ],
    },
    {
      id: 'parenting',
      title: 'Parent Mesh to Armature',
      description: 'Link your mesh to the skeleton with deformation',
      icon: <Zap className="w-5 h-5" />,
      items: [
        {
          id: 'parent-1',
          text: 'Select mesh, then skeleton (in correct order)',
          tip: 'Both selected: mesh outlined white, skeleton highlighted yellow',
          completed: false,
        },
        {
          id: 'parent-2',
          text: 'Press Ctrl+P > "With Armature Deformation"',
          tip: 'NOT "Empty Groups" or "Name Groups". Must be "With Armature Deformation"',
          completed: false,
        },
        {
          id: 'parent-3',
          text: 'Verify mesh now has Armature modifier',
          tip: 'Properties panel > Modifiers. Should see "Armature" with correct skeleton name.',
          completed: false,
        },
        {
          id: 'parent-4',
          text: 'Check vertex groups created for each bone',
          tip: 'Object properties > Vertex Groups. Should have 60+ groups (one per bone).',
          completed: false,
        },
        {
          id: 'parent-5',
          text: 'Switch to Pose mode and test (Tab)',
          tip: 'Pose mode: Tab. Try rotating a bone. Mesh should deform.',
          completed: false,
        },
        {
          id: 'parent-6',
          text: 'Return to Object mode (Tab again)',
          tip: 'Before weight painting, switch back to Object mode',
          completed: false,
        },
      ],
    },
    {
      id: 'weight',
      title: 'Weight Painting',
      description: 'Paint bone influence on mesh vertices',
      icon: <BookOpen className="w-5 h-5" />,
      items: [
        {
          id: 'weight-1',
          text: 'Switch to Weight Paint mode (Ctrl+Tab)',
          tip: 'Or menu: top left > Weight Paint. Viewport turns blue.',
          completed: false,
        },
        {
          id: 'weight-2',
          text: 'Select mesh (not armature)',
          tip: 'Mesh should be highlighted in orange',
          completed: false,
        },
        {
          id: 'weight-3',
          text: 'Select first bone group (pelvis/hips)',
          tip: 'Object properties > Vertex Groups. Click "Pelvis" group.',
          completed: false,
        },
        {
          id: 'weight-4',
          text: 'Paint weights on hip area (soft brush, 0.5 strength)',
          tip: 'Green = full influence (1.0). Blue = no influence (0.0). Paint soft gradient.',
          completed: false,
        },
        {
          id: 'weight-5',
          text: 'Paint left arm on L_Upperarm, L_Forearm, L_Hand',
          tip: 'Shoulders: 50% L_Shoulder, 50% Chest. Elbows: blend two bones.',
          completed: false,
        },
        {
          id: 'weight-6',
          text: 'Paint right arm symmetrically',
          tip: 'Same process as left arm but on right side.',
          completed: false,
        },
        {
          id: 'weight-7',
          text: 'Paint left leg on L_Thigh, L_Calf, L_Foot',
          tip: 'Knees and ankles should have overlapping weights (blend)',
          completed: false,
        },
        {
          id: 'weight-8',
          text: 'Paint right leg symmetrically',
          tip: 'Mirror left leg painting to right side',
          completed: false,
        },
        {
          id: 'weight-9',
          text: 'Paint spine (Spine1, Spine2, Chest)',
          tip: 'Back should have smooth blend across spine bones',
          completed: false,
        },
        {
          id: 'weight-10',
          text: 'Paint neck and head on Head bone',
          tip: 'Neck: blend Neck + Chest. Head: full Head bone',
          completed: false,
        },
        {
          id: 'weight-11',
          text: 'Normalize weights (Object > Weights > Normalize All)',
          tip: 'Ensures each vertex sums to 100% influence. Critical!',
          completed: false,
        },
        {
          id: 'weight-12',
          text: 'Switch to Pose mode and test deformation',
          tip: 'Tab to Pose. Rotate bones. Mesh should deform smoothly.',
          completed: false,
        },
        {
          id: 'weight-13',
          text: 'Refine weights (fix problem areas)',
          tip: 'If mesh tears at joints, add more overlapping weight',
          completed: false,
        },
        {
          id: 'weight-14',
          text: 'Save project',
          tip: 'Save as: project_weighted.blend',
          completed: false,
        },
      ],
    },
    {
      id: 'animation',
      title: 'Create Animation (Optional)',
      description: 'Create a test animation to verify rigging',
      icon: <Zap className="w-5 h-5" />,
      items: [
        {
          id: 'anim-1',
          text: 'Set timeline: 1-60 (2.5 seconds)',
          tip: 'Timeline at bottom. Set start frame: 1, end frame: 60',
          completed: false,
        },
        {
          id: 'anim-2',
          text: 'Switch to Pose mode (Tab)',
          tip: 'Bones now appear in orange outline',
          completed: false,
        },
        {
          id: 'anim-3',
          text: 'Create first pose (frame 1)',
          tip: 'Rotate some bones to create a pose. Example: idle pose.',
          completed: false,
        },
        {
          id: 'anim-4',
          text: 'Insert keyframe (press I on each bone)',
          tip: 'Bone should turn green = keyframed. Or use menu: Pose > Insert Keyframe.',
          completed: false,
        },
        {
          id: 'anim-5',
          text: 'Move to frame 30 (middle)',
          tip: 'Click timeline at frame 30',
          completed: false,
        },
        {
          id: 'anim-6',
          text: 'Adjust pose (slightly different from frame 1)',
          tip: 'Small change. Then insert keyframes again (I).',
          completed: false,
        },
        {
          id: 'anim-7',
          text: 'Move to frame 60 (end)',
          tip: 'Click timeline at frame 60',
          completed: false,
        },
        {
          id: 'anim-8',
          text: 'Copy frame 1 pose to frame 60',
          tip: 'For looping: first frame = last frame. Copy keyframe data.',
          completed: false,
        },
        {
          id: 'anim-9',
          text: 'Play animation (spacebar)',
          tip: 'Press space. Animation plays. Should be smooth.',
          completed: false,
        },
      ],
    },
    {
      id: 'export',
      title: 'Export to NIF',
      description: 'Export rigged mesh/animation as NIF file',
      icon: <BookOpen className="w-5 h-5" />,
      items: [
        {
          id: 'export-1',
          text: 'Switch to Object mode (Tab)',
          tip: 'Green outline mode',
          completed: false,
        },
        {
          id: 'export-2',
          text: 'Deselect all (press A twice)',
          tip: 'Nothing should be highlighted',
          completed: false,
        },
        {
          id: 'export-3',
          text: 'Select ONLY the armature (skeleton)',
          tip: 'Click armature in outliner. Only skeleton selected (orange outline).',
          completed: false,
        },
        {
          id: 'export-4',
          text: 'File > Export > NetImmerse/Gamebryo (.nif)',
          tip: 'Use B3DAN exporter, not standard NIF',
          completed: false,
        },
        {
          id: 'export-5',
          text: 'Set export path: Data\\Meshes\\Animations\\[modname]',
          tip: 'Example: export to D:\\Games\\Fallout4\\Data\\Meshes\\Animations\\MyMod\\',
          completed: false,
        },
        {
          id: 'export-6',
          text: 'Verify export settings: Scale = 0.1',
          tip: 'Critical! Must match import scale.',
          completed: false,
        },
        {
          id: 'export-7',
          text: 'Check "Export Animation" if exporting animation',
          tip: 'Only needed if you created animation. For mesh-only export, uncheck.',
          completed: false,
        },
        {
          id: 'export-8',
          text: 'Set animation name (if exporting animation)',
          tip: 'Example: "idle", "walk", "attack_left"',
          completed: false,
        },
        {
          id: 'export-9',
          text: 'Export file',
          tip: 'Click Export NIF button',
          completed: false,
        },
      ],
    },
    {
      id: 'verify',
      title: 'Verify in NifSkope',
      description: 'Open exported NIF and check structure',
      icon: <CheckCircle2 className="w-5 h-5" />,
      items: [
        {
          id: 'verify-1',
          text: 'Open exported NIF in NifSkope',
          tip: 'File > Open NIF. Navigate to exported file.',
          completed: false,
        },
        {
          id: 'verify-2',
          text: 'Expand tree: click arrows to view hierarchy',
          tip: 'Should see NiNode (armature), then 60+ child bones',
          completed: false,
        },
        {
          id: 'verify-3',
          text: 'Look for NiAnimationData node (if animation exported)',
          tip: 'Should exist in tree. If missing, animation was not exported.',
          completed: false,
        },
        {
          id: 'verify-4',
          text: 'Check for red error text (broken references)',
          tip: 'Red text = error. Green text = OK. Fix errors before importing.',
          completed: false,
        },
        {
          id: 'verify-5',
          text: 'Preview mesh deformation (if applicable)',
          tip: 'Right-click mesh node > Preview. Pose the bones.',
          completed: false,
        },
        {
          id: 'verify-6',
          text: 'No unexpected bones or meshes',
          tip: 'Should only see FO4 skeleton. No custom bones or extra meshes.',
          completed: false,
        },
      ],
    },
    {
      id: 'ingame',
      title: 'Test In-Game',
      description: 'Import and test in Fallout 4',
      icon: <AlertCircle className="w-5 h-5" />,
      items: [
        {
          id: 'ingame-1',
          text: 'Create mod folder in Fallout 4 Data directory',
          tip: 'Folder: Data\\Meshes\\Animations\\MyMod\\',
          completed: false,
        },
        {
          id: 'ingame-2',
          text: 'Copy exported NIF to mod folder',
          tip: 'Copy .nif file from export folder to mod folder',
          completed: false,
        },
        {
          id: 'ingame-3',
          text: 'Create esp/esm mod file (Creation Kit)',
          tip: 'Open Creation Kit, create new mod, link animation NIF',
          completed: false,
        },
        {
          id: 'ingame-4',
          text: 'Test animation on NPC',
          tip: 'Assign animation to NPC in Creation Kit, test in-game',
          completed: false,
        },
        {
          id: 'ingame-5',
          text: 'Check for clipping or mesh distortion',
          tip: 'If bad: redo weight painting. If animation jerks: fix keyframes.',
          completed: false,
        },
        {
          id: 'ingame-6',
          text: 'Verify animation plays at correct speed',
          tip: 'Should be smooth and correct frame rate (24 fps)',
          completed: false,
        },
        {
          id: 'ingame-7',
          text: 'Fix any issues and iterate',
          tip: 'Go back to Blender, fix weights or animation, re-export, re-test',
          completed: false,
        },
      ],
    },
  ]);

  const toggleItem = (phaseId: string, itemId: string) => {
    setPhases((prev) =>
      prev.map((phase) =>
        phase.id === phaseId
          ? {
              ...phase,
              items: phase.items.map((item) =>
                item.id === itemId ? { ...item, completed: !item.completed } : item
              ),
            }
          : phase
      )
    );
  };

  const [expandedPhase, setExpandedPhase] = useState<string>('setup');

  const totalItems = phases.reduce((sum, p) => sum + p.items.length, 0);
  const completedItems = phases.reduce((sum, p) => sum + p.items.filter((i) => i.completed).length, 0);

  return (
    <div className="h-full bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 overflow-hidden flex flex-col">
      {/* Header */}
      <div className="p-6 border-b border-slate-700 bg-slate-800/50">
        <div className="flex items-center gap-3 mb-4">
          <CheckCircle2 className="w-8 h-8 text-green-400" />
          <div>
            <h1 className="text-2xl font-bold text-white">Custom Rigging Checklist</h1>
            <p className="text-sm text-slate-400">Step-by-step guide to rig custom characters for Fallout 4</p>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-slate-400">
              {completedItems} / {totalItems} completed
            </span>
            <span className="text-cyan-400 font-semibold">
              {totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0}%
            </span>
          </div>
          <div className="w-full bg-slate-800 h-3 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-cyan-500 to-green-500 transition-all duration-300"
              style={{ width: `${totalItems > 0 ? (completedItems / totalItems) * 100 : 0}%` }}
            />
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-3xl mx-auto space-y-3">
          <ToolsInstallVerifyPanel
            accentClassName="text-cyan-300"
            description="Rigging is easy to “almost get right”. Use this checklist with a tiny in-game test loop so you don’t spend hours weight painting on a broken skeleton setup."
            tools={[
              { label: 'Blender (official download)', href: 'https://www.blender.org/download/', kind: 'official' },
              { label: 'Nexus search: Better Blender 3', href: 'https://www.nexusmods.com/fallout4/search/?gsearch=Better%20Blender%203&gsearchtype=mods', kind: 'search', note: 'Search for the FO4-focused Blender tooling referenced in this checklist.' },
              { label: 'Nexus search: PyNifly', href: 'https://www.nexusmods.com/fallout4/search/?gsearch=PyNifly&gsearchtype=mods', kind: 'search', note: 'NIF import/export add-on (commonly used in FO4 pipelines).' },
            ]}
            verify={[
              'Check off a couple items and refresh; confirm completion state persists.',
              'Confirm your skeleton import has the expected bone count and exact bone names.',
              'Confirm your export produces a file in the expected folder structure (no “random desktop exports”).'
            ]}
            firstTestLoop={[
              'Import skeleton → bind a tiny test mesh → paint a few weights → export once.',
              'Test in-game (or in your inspection tooling) → fix the first obvious deformation → repeat.'
            ]}
            troubleshooting={[
              'If the game crashes on load, suspect bone naming/hierarchy changes before you suspect weights.',
              'If joints crease hard, re-check weight blending at the joint (two bones should overlap).'
            ]}
            shortcuts={[
              { label: 'Rigging Mistakes', to: '/rigging-mistakes' },
              { label: 'Export Settings', to: '/export-settings' },
              { label: 'Animation Validator', to: '/animation-validator' },
              { label: 'Skeleton Reference', to: '/skeleton-reference' },
            ]}
          />

          {phases.map((phase, phaseIdx) => {
            const phaseCompleted = phase.items.filter((i) => i.completed).length;
            const isExpanded = expandedPhase === phase.id;

            return (
              <div
                key={phase.id}
                className="bg-slate-900 border border-slate-700 rounded-lg overflow-hidden hover:border-slate-600 transition-colors"
              >
                {/* Phase Header */}
                <button
                  onClick={() => setExpandedPhase(isExpanded ? '' : phase.id)}
                  className="w-full px-6 py-4 flex items-center gap-4 hover:bg-slate-800/50 transition-colors text-left"
                >
                  <div className="flex-shrink-0 text-cyan-400">{phase.icon}</div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-bold text-white text-lg">Phase {phaseIdx + 1}: {phase.title}</h3>
                      <span className="text-xs bg-slate-700 px-2 py-1 rounded text-slate-300">
                        {phaseCompleted}/{phase.items.length}
                      </span>
                    </div>
                    <p className="text-sm text-slate-400">{phase.description}</p>
                  </div>
                  <ChevronDown
                    className={`w-5 h-5 text-slate-500 flex-shrink-0 transition-transform ${
                      isExpanded ? 'rotate-180' : ''
                    }`}
                  />
                </button>

                {/* Phase Items */}
                {isExpanded && (
                  <div className="px-6 py-4 bg-slate-950/50 border-t border-slate-700 space-y-3">
                    {phase.items.map((item) => (
                      <div
                        key={item.id}
                        onClick={() => toggleItem(phase.id, item.id)}
                        className={`p-3 rounded border cursor-pointer transition-all ${
                          item.completed
                            ? 'bg-green-950/20 border-green-700/50'
                            : 'bg-slate-900/50 border-slate-700 hover:bg-slate-800/50'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <div
                            className={`flex-shrink-0 w-5 h-5 rounded border mt-0.5 flex items-center justify-center transition-colors ${
                              item.completed
                                ? 'bg-green-500 border-green-600'
                                : 'border-slate-500'
                            }`}
                          >
                            {item.completed && (
                              <CheckCircle2 className="w-4 h-4 text-white" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p
                              className={`font-medium transition-colors ${
                                item.completed
                                  ? 'text-green-300 line-through'
                                  : 'text-white'
                              }`}
                            >
                              {item.text}
                            </p>
                            <p className="text-xs text-slate-400 mt-1">💡 {item.tip}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Footer */}
      <div className="p-4 bg-cyan-900/20 border-t border-slate-700 text-xs text-cyan-300">
        {completedItems === totalItems ? (
          <p>✅ All phases complete! Your custom character is rigged and ready for Fallout 4.</p>
        ) : (
          <p>
            📋 {phaseIdx + 1} phases total. Complete each step before moving to the next. Save frequently!
          </p>
        )}
      </div>
    </div>
  );
};

const phaseIdx = 0; // Placeholder
