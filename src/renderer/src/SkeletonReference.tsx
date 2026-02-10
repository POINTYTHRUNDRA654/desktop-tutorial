import React, { useState } from 'react';
import { Bone, Search, Grid, List, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { openExternal } from './utils/openExternal';

interface SkeletonBone {
  name: string;
  parent: string;
  group: string;
  weightable: boolean;
  description: string;
}

const FO4_SKELETON: SkeletonBone[] = [
  // Root/Pelvis
  { name: 'NPC Root', parent: 'Root', group: 'Root', weightable: false, description: 'Character movement anchor. Do NOT animate.' },
  { name: 'Pelvis', parent: 'NPC Root', group: 'Pelvis', weightable: true, description: 'Hip anchor. Parent to all upper body.' },

  // Spine
  { name: 'Spine1', parent: 'Pelvis', group: 'Spine', weightable: true, description: 'Lower spine. Bends forward/back.' },
  { name: 'Spine2', parent: 'Spine1', group: 'Spine', weightable: true, description: 'Mid spine. Upper back movement.' },
  { name: 'Chest', parent: 'Spine2', group: 'Chest', weightable: true, description: 'Upper chest. Shoulder parent.' },

  // Neck & Head
  { name: 'Neck', parent: 'Chest', group: 'Head', weightable: true, description: 'Neck rotation. Parent to head.' },
  { name: 'Head', parent: 'Neck', group: 'Head', weightable: true, description: 'Main head mesh attachment.' },

  // Left Arm
  { name: 'L_Shoulder', parent: 'Chest', group: 'Left Arm', weightable: true, description: 'Left shoulder joint.' },
  { name: 'L_Upperarm', parent: 'L_Shoulder', group: 'Left Arm', weightable: true, description: 'Left bicep/upper arm.' },
  { name: 'L_Forearm', parent: 'L_Upperarm', group: 'Left Arm', weightable: true, description: 'Left forearm/elbow.' },
  { name: 'L_Hand', parent: 'L_Forearm', group: 'Left Arm', weightable: true, description: 'Left hand/wrist.' },

  // Left Hand Fingers
  { name: 'L_Thumb', parent: 'L_Hand', group: 'Left Hand', weightable: true, description: 'Left thumb.' },
  { name: 'L_Index', parent: 'L_Hand', group: 'Left Hand', weightable: true, description: 'Left index finger.' },
  { name: 'L_Middle', parent: 'L_Hand', group: 'Left Hand', weightable: true, description: 'Left middle finger.' },
  { name: 'L_Ring', parent: 'L_Hand', group: 'Left Hand', weightable: true, description: 'Left ring finger.' },
  { name: 'L_Pinky', parent: 'L_Hand', group: 'Left Hand', weightable: true, description: 'Left pinky finger.' },

  // Right Arm
  { name: 'R_Shoulder', parent: 'Chest', group: 'Right Arm', weightable: true, description: 'Right shoulder joint.' },
  { name: 'R_Upperarm', parent: 'R_Shoulder', group: 'Right Arm', weightable: true, description: 'Right bicep/upper arm.' },
  { name: 'R_Forearm', parent: 'R_Upperarm', group: 'Right Arm', weightable: true, description: 'Right forearm/elbow.' },
  { name: 'R_Hand', parent: 'R_Forearm', group: 'Right Arm', weightable: true, description: 'Right hand/wrist.' },

  // Right Hand Fingers
  { name: 'R_Thumb', parent: 'R_Hand', group: 'Right Hand', weightable: true, description: 'Right thumb.' },
  { name: 'R_Index', parent: 'R_Hand', group: 'Right Hand', weightable: true, description: 'Right index finger.' },
  { name: 'R_Middle', parent: 'R_Hand', group: 'Right Hand', weightable: true, description: 'Right middle finger.' },
  { name: 'R_Ring', parent: 'R_Hand', group: 'Right Hand', weightable: true, description: 'Right ring finger.' },
  { name: 'R_Pinky', parent: 'R_Hand', group: 'Right Hand', weightable: true, description: 'Right pinky finger.' },

  // Left Leg
  { name: 'L_Thigh', parent: 'Pelvis', group: 'Left Leg', weightable: true, description: 'Left hip/thigh.' },
  { name: 'L_Calf', parent: 'L_Thigh', group: 'Left Leg', weightable: true, description: 'Left knee/calf.' },
  { name: 'L_Foot', parent: 'L_Calf', group: 'Left Leg', weightable: true, description: 'Left foot/ankle.' },
  { name: 'L_Toe', parent: 'L_Foot', group: 'Left Leg', weightable: true, description: 'Left toes.' },

  // Right Leg
  { name: 'R_Thigh', parent: 'Pelvis', group: 'Right Leg', weightable: true, description: 'Right hip/thigh.' },
  { name: 'R_Calf', parent: 'R_Thigh', group: 'Right Leg', weightable: true, description: 'Right knee/calf.' },
  { name: 'R_Foot', parent: 'R_Calf', group: 'Right Leg', weightable: true, description: 'Right foot/ankle.' },
  { name: 'R_Toe', parent: 'R_Foot', group: 'Right Leg', weightable: true, description: 'Right toes.' },

  // Facial (Simplified)
  { name: 'Face', parent: 'Head', group: 'Face', weightable: false, description: 'Facial animation controller.' },
];

type SkeletonReferenceProps = {
  embedded?: boolean;
};

export const SkeletonReference: React.FC<SkeletonReferenceProps> = ({ embedded = false }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'hierarchy' | 'group'>('hierarchy');
  const [selectedBone, setSelectedBone] = useState<SkeletonBone | null>(null);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set(['Root', 'Spine', 'Head']));

  const openUrl = (url: string) => {
    void openExternal(url);
  };

  const openNexusSearch = (keywords: string) => {
    const query = encodeURIComponent(keywords);
    openUrl(`https://www.nexusmods.com/fallout4/search/?BH=0&search%5Bsearch_keywords%5D=${query}`);
  };

  const filteredBones = FO4_SKELETON.filter((bone) =>
    bone.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    bone.group.toLowerCase().includes(searchQuery.toLowerCase()) ||
    bone.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const groupedBones = filteredBones.reduce((acc, bone) => {
    if (!acc[bone.group]) acc[bone.group] = [];
    acc[bone.group].push(bone);
    return acc;
  }, {} as Record<string, SkeletonBone[]>);

  const toggleGroup = (group: string) => {
    const newExpanded = new Set(expandedGroups);
    if (newExpanded.has(group)) {
      newExpanded.delete(group);
    } else {
      newExpanded.add(group);
    }
    setExpandedGroups(newExpanded);
  };

  const renderHierarchy = (parent: string, depth: number = 0): React.ReactNode[] => {
    const children = filteredBones.filter((b) => b.parent === parent);
    return children.flatMap((bone) => [
      <button
        key={bone.name}
        onClick={() => setSelectedBone(bone)}
        className={`w-full px-4 py-2 text-left text-sm rounded transition-colors ${
          selectedBone?.name === bone.name
            ? 'bg-cyan-500/30 border border-cyan-500 text-cyan-100'
            : 'hover:bg-slate-700/50 text-slate-300'
        }`}
        style={{ marginLeft: `${depth * 20}px` }}
      >
        <span className="flex items-center gap-2">
          {bone.weightable ? (
            <Bone className="w-3 h-3 text-green-400" />
          ) : (
            <Bone className="w-3 h-3 text-slate-600" />
          )}
          <span className="font-mono text-xs">{bone.name}</span>
        </span>
      </button>,
      ...renderHierarchy(bone.name, depth + 1),
    ]);
  };

  const containerClass = embedded
    ? 'bg-slate-900/60 border border-slate-700 rounded-lg'
    : 'h-full bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 overflow-hidden flex flex-col';

  const headerClass = embedded
    ? 'p-4 border-b border-slate-700 bg-slate-800/50'
    : 'p-6 border-b border-slate-700 bg-slate-800/50';

  const contentClass = embedded
    ? 'p-4 flex flex-col gap-6'
    : 'flex-1 overflow-hidden flex gap-6 p-6';

  const footerClass = embedded
    ? 'p-3 bg-slate-800/50 border-t border-slate-700 text-xs text-slate-400'
    : 'p-4 bg-slate-800/50 border-t border-slate-700 text-xs text-slate-400';

  return (
    <div className={containerClass}>
      {/* Header */}
      <div className={headerClass}>
        <div className="flex items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-3">
            <Bone className="w-8 h-8 text-green-400" />
            <div>
              <h1 className="text-2xl font-bold text-white">Fallout 4 Skeleton Reference</h1>
              <p className="text-sm text-slate-400">{FO4_SKELETON.length} bones, full hierarchy</p>
            </div>
          </div>
          {!embedded && (
            <Link
              to="/reference"
              className="px-3 py-2 border border-green-500/30 text-[10px] font-black uppercase tracking-widest text-green-200 rounded-lg bg-green-500/10 hover:bg-green-500/20 transition-colors"
            >
              Help
            </Link>
          )}
        </div>

        {/* Controls */}
        <div className="flex gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-3 w-4 h-4 text-slate-500" />
            <input
              type="text"
              placeholder="Search bones by name or group..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-950 border border-slate-700 rounded text-white text-sm placeholder-slate-500 focus:outline-none focus:border-cyan-500"
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setViewMode('hierarchy')}
              className={`px-4 py-2 rounded flex items-center gap-2 transition-colors ${
                viewMode === 'hierarchy'
                  ? 'bg-cyan-600 text-white'
                  : 'bg-slate-700/50 text-slate-300 hover:bg-slate-700'
              }`}
            >
              <List className="w-4 h-4" />
              <span className="text-sm font-medium">Hierarchy</span>
            </button>
            <button
              onClick={() => setViewMode('group')}
              className={`px-4 py-2 rounded flex items-center gap-2 transition-colors ${
                viewMode === 'group'
                  ? 'bg-cyan-600 text-white'
                  : 'bg-slate-700/50 text-slate-300 hover:bg-slate-700'
              }`}
            >
              <Grid className="w-4 h-4" />
              <span className="text-sm font-medium">By Group</span>
            </button>
          </div>
        </div>

        <div className="mt-5 bg-slate-950/50 border border-slate-700 rounded-lg p-4">
          <div className="text-sm font-bold text-cyan-300 mb-2">🧰 Tools / Install / Verify (No Guesswork)</div>
          <p className="text-xs text-slate-300">
            This page is a <strong>reference</strong> for FO4 bone names + hierarchy. To actually rig/export, you’ll need the usual Fallout 4 animation toolchain.
          </p>

          <div className="mt-3 flex flex-wrap gap-2">
            <button
              onClick={() => openUrl('https://www.blender.org/download/')}
              className="px-3 py-2 rounded bg-slate-800 hover:bg-slate-700 border border-slate-600 text-xs font-bold text-white"
            >
              Blender (official)
            </button>
            <button
              onClick={() => openNexusSearch('Bethesda Archive Extractor')}
              className="px-3 py-2 rounded bg-slate-800 hover:bg-slate-700 border border-slate-600 text-xs font-bold text-white"
            >
              Nexus: BAE (search)
            </button>
            <button
              onClick={() => openUrl('https://github.com/niftools/nifskope/releases')}
              className="px-3 py-2 rounded bg-slate-800 hover:bg-slate-700 border border-slate-600 text-xs font-bold text-white"
            >
              GitHub: NifSkope releases
            </button>
            <button
              onClick={() => openNexusSearch('Fallout 4 skeleton')}
              className="px-3 py-2 rounded bg-slate-800 hover:bg-slate-700 border border-slate-600 text-xs font-bold text-white"
            >
              Nexus: Skeleton resources (search)
            </button>
          </div>

          <div className="mt-3 bg-black/40 border border-slate-700 rounded p-3">
            <div className="text-xs font-bold text-slate-200 mb-1">First test loop (rig/skin sanity)</div>
            <ol className="text-xs text-slate-300 list-decimal list-inside space-y-1">
              <li>Pick one bone from this list (e.g., <span className="font-mono">L_Forearm</span>), and ensure your mesh weights to that bone (non-zero weights).</li>
              <li>In Blender, pose that bone and confirm deformation looks correct (no spikes/explosions).</li>
              <li>Export using your chosen pipeline and validate using the in-app Animation tools.</li>
            </ol>
          </div>

          {!embedded && (
            <div className="mt-3 text-[11px] text-slate-500">
              Use the sidebar to open animation, rigging, export, or install tools if you need them.
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className={contentClass}>
        {/* Bone List */}
        <div className="flex-1 bg-slate-950/50 border border-slate-700 rounded-lg overflow-y-auto">
          <div className="p-4 space-y-2">
            {viewMode === 'hierarchy' ? (
              <div className="space-y-1">{renderHierarchy('NPC Root')}</div>
            ) : (
              <div className="space-y-3">
                {Object.entries(groupedBones)
                  .sort(([a], [b]) => a.localeCompare(b))
                  .map(([group, bones]) => (
                    <div key={group} className="border border-slate-700 rounded">
                      <button
                        onClick={() => toggleGroup(group)}
                        className="w-full px-4 py-2 flex items-center gap-2 hover:bg-slate-800/50 transition-colors font-semibold text-cyan-300"
                      >
                        <ChevronRight
                          className={`w-4 h-4 transition-transform ${
                            expandedGroups.has(group) ? 'rotate-90' : ''
                          }`}
                        />
                        {group} ({bones.length})
                      </button>
                      {expandedGroups.has(group) && (
                        <div className="bg-slate-900/50 border-t border-slate-700 space-y-1 p-2">
                          {bones.map((bone) => (
                            <button
                              key={bone.name}
                              onClick={() => setSelectedBone(bone)}
                              className={`w-full px-3 py-2 text-left text-sm rounded transition-colors ${
                                selectedBone?.name === bone.name
                                  ? 'bg-cyan-500/30 border border-cyan-500 text-cyan-100'
                                  : 'hover:bg-slate-700/50 text-slate-300'
                              }`}
                            >
                              <span className="flex items-center gap-2">
                                {bone.weightable ? (
                                  <Bone className="w-3 h-3 text-green-400" />
                                ) : (
                                  <Bone className="w-3 h-3 text-slate-600" />
                                )}
                                <span className="font-mono text-xs">{bone.name}</span>
                              </span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
              </div>
            )}
          </div>
        </div>

        {/* Detail Panel */}
        {selectedBone ? (
          <div className="w-96 bg-slate-950/50 border border-slate-700 rounded-lg overflow-y-auto p-6">
            <div className="space-y-4">
              <div>
                <h3 className="text-xl font-bold text-white mb-2">{selectedBone.name}</h3>
                <p className="text-sm text-slate-400">
                  <span className="text-slate-500">Group: </span>
                  <span className="text-cyan-300">{selectedBone.group}</span>
                </p>
                <p className="text-sm text-slate-400">
                  <span className="text-slate-500">Parent: </span>
                  <span className="text-cyan-300">{selectedBone.parent}</span>
                </p>
              </div>

              <div className="border-t border-slate-700 pt-4">
                <h4 className="font-semibold text-white mb-2 flex items-center gap-2">
                  {selectedBone.weightable ? (
                    <>
                      <Bone className="w-4 h-4 text-green-400" />
                      <span>Weightable Bone</span>
                    </>
                  ) : (
                    <>
                      <Bone className="w-4 h-4 text-slate-600" />
                      <span>Non-Weightable</span>
                    </>
                  )}
                </h4>
                <p className="text-sm text-slate-300">{selectedBone.description}</p>
              </div>

              <div className="bg-cyan-900/20 border border-cyan-700/30 rounded p-4">
                <h4 className="font-semibold text-cyan-300 mb-2">Weight Painting Tips</h4>
                <ul className="text-xs text-cyan-200/80 space-y-2 list-disc list-inside">
                  <li>Use soft brush for smooth deformation</li>
                  <li>Start with low weight (0.5) and refine</li>
                  <li>Test by rotating bone in Pose mode</li>
                  <li>Avoid hard edges on organic geometry</li>
                  <li>Use overlapping weights for joints</li>
                </ul>
              </div>

              <div className="bg-blue-900/20 border border-blue-700/30 rounded p-4">
                <h4 className="font-semibold text-blue-300 mb-2">Export Checklist</h4>
                <ul className="text-xs text-blue-200/80 space-y-2 list-disc list-inside">
                  <li>Bone name matches exactly (case-sensitive)</li>
                  <li>No extra bones added to skeleton</li>
                  <li>All meshes parented to this bone</li>
                  <li>Weight painted (no zero-influence)</li>
                  <li>Scale set to 0.1 on export</li>
                </ul>
              </div>
            </div>
          </div>
        ) : (
          <div className="w-96 bg-slate-950/50 border border-slate-700 rounded-lg overflow-y-auto p-6 flex items-center justify-center">
            <p className="text-center text-slate-400">Select a bone to view details</p>
          </div>
        )}
      </div>

      {/* Footer Stats */}
      <div className={footerClass}>
        <div className="flex justify-between">
          <span>Total Bones: {FO4_SKELETON.length}</span>
          <span>Weightable: {FO4_SKELETON.filter((b) => b.weightable).length}</span>
          <span>Found: {filteredBones.length}</span>
        </div>
      </div>
    </div>
  );
};
