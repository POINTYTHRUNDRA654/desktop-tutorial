import React, { useState } from 'react';
import { AlertCircle, CheckCircle2, ChevronDown, Zap } from 'lucide-react';
import { ToolsInstallVerifyPanel } from './components/ToolsInstallVerifyPanel';

interface MistakeExample {
  id: string;
  title: string;
  category: 'weight-painting' | 'bone-naming' | 'animation' | 'export' | 'rigging';
  severity: 'critical' | 'major' | 'minor';
  description: string;
  what_went_wrong: string;
  visual_symptoms: string[];
  root_cause: string;
  fix_steps: string[];
  prevention: string;
  estimated_time: string;
}

export const RiggingMistakesGallery: React.FC = () => {
  const [expandedId, setExpandedId] = useState<string>('');
  const [filterCategory, setFilterCategory] = useState<string>('all');

  const mistakes: MistakeExample[] = [
    {
      id: 'weight-100-percent',
      title: 'Single Bone Has 100% Weight Everywhere',
      category: 'weight-painting',
      severity: 'critical',
      description: 'Character mesh is assigned entirely to one bone (e.g., Pelvis), with no overlapping weights at joints.',
      what_went_wrong: 'Painted only the Pelvis bone and left other bones at 0% weight',
      visual_symptoms: [
        'Entire character moves with pelvis only',
        'Arms/legs don\'t bend properly',
        'Mesh tears apart at joints when bones rotate',
        'Character looks like rigid action figure',
      ],
      root_cause: 'Incomplete weight painting. Didn\'t assign vertices to arm, leg, or spine bones.',
      fix_steps: [
        '1. Switch to Weight Paint mode',
        '2. Select each bone group systematically (L_Shoulder, L_Upperarm, L_Forearm, L_Hand)',
        '3. Paint weight on each bone (start with 0.5 brush strength)',
        '4. At joints: blend two bones (Shoulder = 50% chest + 50% shoulder)',
        '5. Test in Pose mode by rotating each bone',
        '6. Refine problem areas until smooth',
        '7. Normalize all weights (Object > Weights > Normalize All)',
      ],
      prevention: 'Plan weight painting region-by-region. Paint pelvis, then left arm, then right arm, then legs, then spine.',
      estimated_time: '30-60 minutes for a character',
    },
    {
      id: 'hard-edge-joints',
      title: 'Hard Edge Deformation at Joints (No Blending)',
      category: 'weight-painting',
      severity: 'major',
      description: 'Mesh has sharp deformation lines where bones meet. Joints look creased instead of smooth.',
      what_went_wrong: 'Each bone has 100% weight on vertices it controls, zero overlap with adjacent bones',
      visual_symptoms: [
        'Sharp crease at elbow when arm bends',
        'Pinching at knee joint',
        'Visible seams where shoulder meets chest',
        'Mesh doesn\'t bend smoothly (looks broken)',
      ],
      root_cause: 'No weight blending at joint areas. Adjacent bones have zero influence on each other\'s vertices.',
      fix_steps: [
        '1. Switch to Weight Paint mode',
        '2. Select joint area (e.g., elbow = where L_Upperarm meets L_Forearm)',
        '3. Increase brush size',
        '4. Use soft brush (not hard brush)',
        '5. Paint soft gradient: 75% Upperarm + 25% Forearm on that region',
        '6. Test in Pose mode: rotate elbow - should be smooth now',
        '7. Repeat for all major joints (shoulders, hips, knees, ankles)',
      ],
      prevention: 'Always use soft brush for weight painting. Hard brush creates hard edges. Overlap weights at every joint by 10-30%.',
      estimated_time: '20-30 minutes to fix',
    },
    {
      id: 'unweighted-verts',
      title: 'Unweighted Vertices (Blue Areas in Weight Paint)',
      category: 'weight-painting',
      severity: 'critical',
      description: 'Some mesh vertices have zero weight assigned (appear blue in Weight Paint mode). These vertices don\'t follow bones.',
      what_went_wrong: 'Missed painting certain mesh areas. Vertices have no bone influence.',
      visual_symptoms: [
        'Mesh tears apart when bones rotate',
        'Floating vertices that don\'t follow skeleton',
        'Blue areas visible in Weight Paint mode',
        'Character looks mutilated in-game',
      ],
      root_cause: 'Incomplete weight painting. Skipped regions when painting weights.',
      fix_steps: [
        '1. Switch to Weight Paint mode',
        '2. Identify blue areas (no weight)',
        '3. Select the appropriate bone for that region',
        '4. Paint weight on the blue area until it turns green',
        '5. Check every part of mesh: arms, legs, hands, feet, face, torso',
        '6. Use "Weight from Bones" auto-weight as fallback if stuck',
        '7. Verify all blue is gone before exporting',
      ],
      prevention: 'After weight painting all bones, scan in Weight Paint mode for any blue areas. Fix before export.',
      estimated_time: '15-45 minutes depending on amount',
    },
    {
      id: 'bone-name-mismatch',
      title: 'Bone Names Don\'t Match FO4 Standard (Case-Sensitive)',
      category: 'bone-naming',
      severity: 'critical',
      description: 'Imported skeleton but bone names are wrong. Example: "Arm_L" instead of "L_Upperarm"',
      what_went_wrong: 'Used default import settings or didn\'t verify skeleton matches FO4 naming convention',
      visual_symptoms: [
        'Animation data doesn\'t apply (skeleton bones exist but aren\'t animated)',
        'NifSkope shows empty controllers (no bone transform data)',
        'Animation plays on wrong bones or doesn\'t play at all',
      ],
      root_cause: 'FO4 skeleton must have EXACT bone names. Blender from another game or mod has different naming.',
      fix_steps: [
        '1. Delete current skeleton',
        '2. Locate correct FO4 skeleton NIF from Fallout 4 data files',
        '3. Import using Better Blender 3 add-on (it handles naming)',
        '4. Verify bone names in Outliner: L_Upperarm, L_Forearm, L_Hand, etc.',
        '5. Compare with Skeleton Reference tool in Mossy',
        '6. If names wrong, re-import correct skeleton',
      ],
      prevention: 'Always use official FO4 skeleton from Better Blender 3 importer. Don\'t modify bone names.',
      estimated_time: '10 minutes (re-import only)',
    },
    {
      id: 'custom-bones-added',
      title: 'Custom Bones Added to Skeleton',
      category: 'rigging',
      severity: 'critical',
      description: 'Added extra bones to FO4 skeleton (e.g., "Tail", "Wings", custom bones). FO4 only recognizes ~60 official bones.',
      what_went_wrong: 'Created custom bones in Blender for unique character parts',
      visual_symptoms: [
        'Game crash on character load',
        'CTD when animation plays',
        'NifSkope shows unrecognized bones',
        'FO4 engine rejects unknown bone data',
      ],
      root_cause: 'FO4 uses FIXED skeleton. Cannot add new bones. Must work within 60 official bones.',
      fix_steps: [
        '1. Delete all custom bones',
        '2. For custom mesh parts (tail, wings, etc.): parent to existing bone instead',
        '3. Example: Attach tail mesh to Spine2 or Pelvis, then weight-paint to that bone',
        '4. Verify skeleton has ONLY official 60 bones',
        '5. Re-export without custom bones',
      ],
      prevention: 'Always work within FO4\'s fixed skeleton. Parent custom geometry to existing bones. No new bones allowed.',
      estimated_time: '5-15 minutes to delete and reparent',
    },
    {
      id: 'animation-jerky-loop',
      title: 'Animation Jerky at Loop Point (First ≠ Last Frame)',
      category: 'animation',
      severity: 'major',
      description: 'Animation loops but has visible jump/snap at the transition. Not smooth.',
      what_went_wrong: 'First frame pose doesn\'t match last frame pose. Creates abrupt transition on loop.',
      visual_symptoms: [
        'Animation plays smoothly then snaps at end',
        'Character position jumps when looping',
        'Jittery transition in repeating idle animations',
        'Looks unpolished in-game',
      ],
      root_cause: 'For looping animations: first frame MUST equal last frame to transition smoothly.',
      fix_steps: [
        '1. Go to frame 1 (timeline)',
        '2. Switch to Pose mode',
        '3. Note the pose (positions of all bones)',
        '4. Go to last frame',
        '5. Copy frame 1 pose to last frame (manually or via pose copy)',
        '6. Verify they match exactly',
        '7. Play animation - should loop without snap',
      ],
      prevention: 'For looping animations: always end with first frame pose. Before exporting, verify frame 1 = frame 60.',
      estimated_time: '5 minutes',
    },
    {
      id: 'root-bone-animated',
      title: 'Root Bone or NPC Root is Animated (Causing Movement)',
      category: 'animation',
      severity: 'major',
      description: 'Character position moves in-game unexpectedly. Root bone has position keyframes (shouldn\'t move).',
      what_went_wrong: 'Animated NPC Root bone for movement, but it shouldn\'t have translation keyframes',
      visual_symptoms: [
        'Character drifts across scene during idle animation',
        'Position changes unexpectedly',
        'Walking animation moves wrong direction',
        'Camera follows character off-screen',
      ],
      root_cause: 'NPC Root is world anchor. Only use it for rotation (turning). Never for translation (movement).',
      fix_steps: [
        '1. Select NPC Root bone',
        '2. Go to Graph Editor',
        '3. Delete any translation keyframes (only keep rotation if needed)',
        '4. Keep world position fixed (0, 0, 0)',
        '5. Test in Pose mode: NPC Root shouldn\'t move position',
        '6. Lower bones (Spine, Legs) can move freely',
      ],
      prevention: 'NPC Root = world anchor (no position change). Animate only lower skeleton for movement.',
      estimated_time: '5-10 minutes',
    },
    {
      id: 'scale-10x',
      title: 'Scale Wrong (1.0 instead of 0.1) - Character 10x Larger',
      category: 'export',
      severity: 'critical',
      description: 'Character appears 10x larger than vanilla actors. Everything is oversized.',
      what_went_wrong: 'Export scale set to 1.0 instead of 0.1. FO4 uses 0.1 scale.',
      visual_symptoms: [
        'Character is giant compared to environment',
        'Doors and objects appear tiny',
        'Camera clipping issues (too large)',
        'Character doesn\'t fit in world',
      ],
      root_cause: 'Scale mismatch. Import was 0.1, export was 1.0. MUST match.',
      fix_steps: [
        '1. Delete imported mesh from game',
        '2. Re-export from Blender with scale: 0.1',
        '3. Verify NIF in NifSkope (scale should appear correct)',
        '4. Re-import into game',
      ],
      prevention: 'ALWAYS scale 0.1 on export. Write it down. It\'s the #1 mistake.',
      estimated_time: '5 minutes (re-export)',
    },
    {
      id: 'export-anim-flag-wrong',
      title: 'Export Animation Flag Wrong (ON when should be OFF)',
      category: 'export',
      severity: 'major',
      description: 'Exported mesh file but included animation data when you only wanted the mesh.',
      what_went_wrong: 'Checked "Export Animation" for a mesh-only export',
      visual_symptoms: [
        'File size larger than expected',
        'Animation data included unnecessarily',
        'NIF structure has unwanted animation controllers',
      ],
      root_cause: 'Animation flag toggles animation data. Should match your intent (animation = ON, mesh only = OFF).',
      fix_steps: [
        '1. Delete exported mesh',
        '2. Re-export with Export Animation: OFF (unchecked)',
        '3. Verify file size is smaller',
      ],
      prevention: 'Mesh only → Export Animation OFF. Animation only → Export Animation ON. Check before export.',
      estimated_time: '3 minutes',
    },
    {
      id: 'mesh-selected-export',
      title: 'Mesh Selected During Export (Should Only Select Armature)',
      category: 'export',
      severity: 'major',
      description: 'Both mesh and armature were selected when exporting. File contains both.',
      what_went_wrong: 'Forgot to deselect mesh before exporting',
      visual_symptoms: [
        'File size much larger than expected',
        'Animation export has mesh geometry embedded',
        'Unexpected geometry in NIF',
      ],
      root_cause: 'Multiple objects selected = all get exported. Only armature should be selected.',
      fix_steps: [
        '1. Delete export',
        '2. Deselect all (A key, twice)',
        '3. Click ONLY the armature in Outliner',
        '4. Verify: only armature highlighted in orange',
        '5. Export again',
      ],
      prevention: 'Before export: Deselect all (A). Click armature ONLY. Verify only armature is selected (orange outline).',
      estimated_time: '3 minutes',
    },
    {
      id: 'skeleton-export-on',
      title: 'Export Skeleton: ON (Creating Nested Bones)',
      category: 'export',
      severity: 'critical',
      description: 'For animation-only export, Export Skeleton was ON. Created duplicate nested bone hierarchy.',
      what_went_wrong: 'Checking "Export Skeleton" when exporting animations',
      visual_symptoms: [
        'NifSkope shows bones inside bones (nested hierarchy)',
        'Game crash on animation play',
        'FO4 doesn\'t recognize bone structure',
        'Animation data orphaned (no bones to animate)',
      ],
      root_cause: 'For animations: Export Skeleton = OFF (you\'re animating existing skeleton). For custom rigged bodies: ON.',
      fix_steps: [
        '1. Identify export scenario (animation only vs custom rigged)',
        '2. Use Export Settings Helper tool to verify settings',
        '3. Re-export with correct skeleton setting',
      ],
      prevention: 'Animation only → Export Skeleton OFF. Custom rigged body → Export Skeleton ON. Use helper guide.',
      estimated_time: '3 minutes',
    },
    {
      id: 'animation-name-blank',
      title: 'Animation Name Left Blank (No Animation Data in NIF)',
      category: 'export',
      severity: 'critical',
      description: 'Exported animation but Animation Name field was empty. NIF has no animation data.',
      what_went_wrong: 'Forgot to fill in Animation Name field in export dialog',
      visual_symptoms: [
        'NifSkope shows no NiAnimationData',
        'Animation doesn\'t play in-game',
        'File appears to have animation but doesn\'t',
      ],
      root_cause: 'Animation Name field is REQUIRED when Export Animation = ON',
      fix_steps: [
        '1. Delete export',
        '2. Re-export with Animation Name filled in (e.g., "idle", "walk_forward")',
        '3. Verify NifSkope shows NiAnimationData node',
      ],
      prevention: 'If Export Animation = ON, Animation Name field MUST be filled. Use Export Settings Helper.',
      estimated_time: '3 minutes',
    },
  ];

  const categories = [
    { id: 'all', label: 'All Mistakes' },
    { id: 'weight-painting', label: 'Weight Painting' },
    { id: 'bone-naming', label: 'Bone Naming' },
    { id: 'animation', label: 'Animation' },
    { id: 'export', label: 'Export' },
    { id: 'rigging', label: 'Rigging' },
  ];

  const filteredMistakes =
    filterCategory === 'all'
      ? mistakes
      : mistakes.filter((m) => m.category === filterCategory);

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'bg-red-900/20 border-red-700/50 text-red-400';
      case 'major':
        return 'bg-orange-900/20 border-orange-700/50 text-orange-400';
      case 'minor':
        return 'bg-yellow-900/20 border-yellow-700/50 text-yellow-400';
      default:
        return 'bg-slate-800 border-slate-700 text-slate-300';
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical':
        return '🚨';
      case 'major':
        return '⚠️';
      case 'minor':
        return '⚡';
      default:
        return 'ℹ️';
    }
  };

  return (
    <div className="h-full bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 overflow-hidden flex flex-col">
      {/* Header */}
      <div className="p-6 border-b border-slate-700 bg-slate-800/50">
        <div className="flex items-center gap-3 mb-4">
          <AlertCircle className="w-8 h-8 text-red-400" />
          <div>
            <h1 className="text-2xl font-bold text-white">Rigging Mistakes Gallery</h1>
            <p className="text-sm text-slate-400">Learn from common errors before they happen</p>
          </div>
        </div>

        {/* Category Filter */}
        <div className="flex gap-2 flex-wrap mt-4">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setFilterCategory(cat.id)}
              className={`px-3 py-1.5 rounded text-xs font-medium transition-all ${
                filterCategory === cat.id
                  ? 'bg-red-600 text-white'
                  : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-4xl mx-auto space-y-3">
          <ToolsInstallVerifyPanel
            accentClassName="text-red-300"
            description="Use this gallery as a debugging index: pick the symptom you see, apply the smallest fix, then re-test immediately."
            tools={[
              { label: 'Blender (official download)', href: 'https://www.blender.org/download/', kind: 'official', note: 'Most fixes here are done directly in Blender.' },
            ]}
            verify={[
              'Change the category filter and confirm the list updates.',
              'Expand one example and confirm you can read fix steps + prevention.'
            ]}
            firstTestLoop={[
              'Identify one symptom → apply only the first fix step → re-export → re-test.',
              'Repeat until the symptom changes; then move to the next step.'
            ]}
            troubleshooting={[
              'If you do not know “what changed”, fix one variable at a time (one bone, one weight group, one export toggle).',
              'If “everything looks wrong”, start with scale + bone naming before touching weights.'
            ]}
            shortcuts={[
              { label: 'Rigging Checklist', to: '/rigging-checklist' },
              { label: 'Export Settings', to: '/export-settings' },
              { label: 'Animation Validator', to: '/animation-validator' },
              { label: 'Animation Guide', to: '/animation-guide' },
            ]}
          />

          {filteredMistakes.map((mistake) => (
            <div
              key={mistake.id}
              className={`border rounded-lg overflow-hidden ${getSeverityColor(mistake.severity)}`}
            >
              {/* Header */}
              <button
                onClick={() => setExpandedId(expandedId === mistake.id ? '' : mistake.id)}
                className="w-full px-6 py-4 flex items-start gap-4 hover:bg-slate-800/30 transition-colors text-left"
              >
                <span className="text-3xl flex-shrink-0 mt-0.5">
                  {getSeverityIcon(mistake.severity)}
                </span>
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-white text-lg">{mistake.title}</h3>
                  <p className="text-sm text-slate-300 mt-1">{mistake.description}</p>
                  <div className="flex gap-2 mt-2 flex-wrap">
                    <span className="text-xs px-2 py-1 bg-slate-900/50 rounded border border-slate-700 text-slate-300">
                      {mistake.category}
                    </span>
                    <span className="text-xs px-2 py-1 bg-slate-900/50 rounded border border-slate-700 text-slate-300">
                      {mistake.severity.toUpperCase()}
                    </span>
                    <span className="text-xs px-2 py-1 bg-slate-900/50 rounded border border-slate-700 text-slate-300">
                      Fix: {mistake.estimated_time}
                    </span>
                  </div>
                </div>
                <ChevronDown
                  className={`w-5 h-5 text-slate-400 flex-shrink-0 mt-1 transition-transform ${
                    expandedId === mistake.id ? 'rotate-180' : ''
                  }`}
                />
              </button>

              {/* Details */}
              {expandedId === mistake.id && (
                <div className="px-6 py-4 bg-slate-950/30 border-t border-slate-700/50 space-y-4">
                  {/* What Went Wrong */}
                  <div>
                    <h4 className="text-sm font-bold text-white mb-2 flex items-center gap-2">
                      <span className="text-red-400">❌</span> What Went Wrong
                    </h4>
                    <p className="text-sm text-slate-300">{mistake.what_went_wrong}</p>
                  </div>

                  {/* Visual Symptoms */}
                  <div>
                    <h4 className="text-sm font-bold text-white mb-2 flex items-center gap-2">
                      <span className="text-orange-400">👁️</span> Visual Symptoms
                    </h4>
                    <ul className="space-y-1">
                      {mistake.visual_symptoms.map((symptom, idx) => (
                        <li key={idx} className="text-sm text-slate-300 flex gap-2">
                          <span className="text-orange-400">•</span>
                          <span>{symptom}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Root Cause */}
                  <div>
                    <h4 className="text-sm font-bold text-white mb-2 flex items-center gap-2">
                      <span className="text-yellow-400">🔍</span> Root Cause
                    </h4>
                    <p className="text-sm text-slate-300">{mistake.root_cause}</p>
                  </div>

                  {/* Fix Steps */}
                  <div>
                    <h4 className="text-sm font-bold text-white mb-2 flex items-center gap-2">
                      <span className="text-green-400">✓</span> How to Fix
                    </h4>
                    <ol className="space-y-2">
                      {mistake.fix_steps.map((step, idx) => (
                        <li key={idx} className="text-sm text-slate-300">
                          <span className="text-green-400 font-bold">{step.split('.')[0]}.</span>
                          <span> {step.substring(step.indexOf(' ') + 1)}</span>
                        </li>
                      ))}
                    </ol>
                  </div>

                  {/* Prevention */}
                  <div className="bg-cyan-900/20 border border-cyan-700/30 rounded p-3">
                    <h4 className="text-sm font-bold text-cyan-400 mb-1 flex items-center gap-2">
                      <Zap className="w-4 h-4" />
                      Prevention
                    </h4>
                    <p className="text-sm text-cyan-200">{mistake.prevention}</p>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div className="p-4 bg-red-900/20 border-t border-slate-700 text-xs text-red-300">
        💡 Tip: Bookmark this page. If something looks wrong in-game, search this gallery. Your issue is likely here with a fix.
      </div>
    </div>
  );
};
