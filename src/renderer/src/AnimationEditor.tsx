/**
 * Animation Editor Component
 * 
 * Complete animation editing UI with:
 * - Skeleton hierarchy panel (left)
 * - 3D viewport with mesh and skeleton (center)
 * - Properties panel (right)
 * - Timeline editor (bottom)
 * - Weight painting mode
 */

import React, { useState, useCallback, useRef, useMemo } from 'react';
import {
  ChevronRight,
  ChevronDown,
  Eye,
  EyeOff,
  Trash2,
  Plus,
  Play,
  Pause,
  RotateCcw,
  Settings,
  Maximize2,
  Move,
  RotateCw,
  Copy,
  Sliders,
  Palette,
  ZoomIn,
  ZoomOut,
  Grid3x3,
  Maximize,
} from 'lucide-react';

interface SkeletonBone {
  id: string;
  name: string;
  parentId?: string;
  children: string[];
  visible: boolean;
  position: { x: number; y: number; z: number };
  rotation: { x: number; y: number; z: number };
  scale: { x: number; y: number; z: number };
  length: number;
}

interface Keyframe {
  boneId: string;
  frame: number;
  position?: { x: number; y: number; z: number };
  rotation?: { x: number; y: number; z: number };
  scale?: { x: number; y: number; z: number };
}

interface EditorState {
  skeleton: SkeletonBone[];
  selectedBone: string | null;
  currentFrame: number;
  totalFrames: number;
  isPlaying: boolean;
  keyframes: Keyframe[];
  expandedBones: Set<string>;
  mode: 'edit' | 'paint' | 'ik';
  viewportMode: 'wireframe' | 'shaded' | 'xray';
  paintBrushSize: number;
  paintBrushStrength: number;
  autoNormalize: boolean;
  mirrorPaint: boolean;
}

const MOCK_SKELETON: SkeletonBone[] = [
  {
    id: 'bone-pelvis',
    name: 'Pelvis',
    parentId: undefined,
    children: ['bone-spine'],
    visible: true,
    position: { x: 0, y: 0, z: 0 },
    rotation: { x: 0, y: 0, z: 0 },
    scale: { x: 1, y: 1, z: 1 },
    length: 5,
  },
  {
    id: 'bone-spine',
    name: 'Spine',
    parentId: 'bone-pelvis',
    children: ['bone-spine1', 'bone-larm', 'bone-rarm'],
    visible: true,
    position: { x: 0, y: 5, z: 0 },
    rotation: { x: 0, y: 0, z: 0 },
    scale: { x: 1, y: 1, z: 1 },
    length: 8,
  },
  {
    id: 'bone-spine1',
    name: 'Spine1',
    parentId: 'bone-spine',
    children: [],
    visible: true,
    position: { x: 0, y: 8, z: 0 },
    rotation: { x: 0, y: 0, z: 0 },
    scale: { x: 1, y: 1, z: 1 },
    length: 6,
  },
  {
    id: 'bone-larm',
    name: 'LArm',
    parentId: 'bone-spine',
    children: [],
    visible: true,
    position: { x: -8, y: 13, z: 0 },
    rotation: { x: 0, y: 0, z: 0 },
    scale: { x: 1, y: 1, z: 1 },
    length: 12,
  },
  {
    id: 'bone-rarm',
    name: 'RArm',
    parentId: 'bone-spine',
    children: [],
    visible: true,
    position: { x: 8, y: 13, z: 0 },
    rotation: { x: 0, y: 0, z: 0 },
    scale: { x: 1, y: 1, z: 1 },
    length: 12,
  },
  {
    id: 'bone-lleg',
    name: 'LLeg',
    parentId: 'bone-pelvis',
    children: [],
    visible: true,
    position: { x: -3, y: -15, z: 0 },
    rotation: { x: 0, y: 0, z: 0 },
    scale: { x: 1, y: 1, z: 1 },
    length: 15,
  },
  {
    id: 'bone-rleg',
    name: 'RLeg',
    parentId: 'bone-pelvis',
    children: [],
    visible: true,
    position: { x: 3, y: -15, z: 0 },
    rotation: { x: 0, y: 0, z: 0 },
    scale: { x: 1, y: 1, z: 1 },
    length: 15,
  },
];

export const AnimationEditor: React.FC = () => {
  const [state, setState] = useState<EditorState>({
    skeleton: MOCK_SKELETON,
    selectedBone: 'bone-spine',
    currentFrame: 0,
    totalFrames: 120,
    isPlaying: false,
    keyframes: [],
    expandedBones: new Set(['bone-pelvis', 'bone-spine']),
    mode: 'edit',
    viewportMode: 'shaded',
    paintBrushSize: 10,
    paintBrushStrength: 0.5,
    autoNormalize: true,
    mirrorPaint: false,
  });

  const viewportRef = useRef<HTMLDivElement>(null);

  // Get selected bone data
  const selectedBone = useMemo(
    () => state.skeleton.find((b) => b.id === state.selectedBone),
    [state.skeleton, state.selectedBone]
  );

  // Get bone's keyframes for current frame
  const currentKeyframes = useMemo(
    () => state.keyframes.filter((k) => k.frame === state.currentFrame),
    [state.keyframes, state.currentFrame]
  );

  // Hierarchy tree rendering
  const renderBoneTree = useCallback((parentId?: string, depth: number = 0) => {
    const bones = state.skeleton.filter((b) => b.parentId === parentId);

    return (
      <div>
        {bones.map((bone) => {
          const isExpanded = state.expandedBones.has(bone.id);
          const hasChildren = bone.children.length > 0;

          return (
            <div key={bone.id}>
              <div
                className={`flex items-center gap-1 px-2 py-1 hover:bg-slate-700 cursor-pointer ${
                  state.selectedBone === bone.id ? 'bg-blue-600' : ''
                }`}
                style={{ paddingLeft: `${depth * 16 + 8}px` }}
                onClick={() =>
                  setState((prev) => ({
                    ...prev,
                    selectedBone: bone.id,
                  }))
                }
              >
                {hasChildren && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setState((prev) => {
                        const newExpanded = new Set(prev.expandedBones);
                        if (newExpanded.has(bone.id)) {
                          newExpanded.delete(bone.id);
                        } else {
                          newExpanded.add(bone.id);
                        }
                        return { ...prev, expandedBones: newExpanded };
                      });
                    }}
                    className="p-0 hover:bg-slate-600 rounded"
                  >
                    {isExpanded ? (
                      <ChevronDown size={16} />
                    ) : (
                      <ChevronRight size={16} />
                    )}
                  </button>
                )}
                {!hasChildren && <div className="w-4" />}

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setState((prev) => ({
                      ...prev,
                      skeleton: prev.skeleton.map((b) =>
                        b.id === bone.id ? { ...b, visible: !b.visible } : b
                      ),
                    }));
                  }}
                  className="p-0 hover:bg-slate-600 rounded"
                >
                  {bone.visible ? <Eye size={16} /> : <EyeOff size={16} />}
                </button>

                <span className="text-sm flex-1">{bone.name}</span>
              </div>

              {isExpanded && renderBoneTree(bone.id, depth + 1)}
            </div>
          );
        })}
      </div>
    );
  }, [state.skeleton, state.selectedBone, state.expandedBones]);

  // Playback controls
  const handlePlayPause = useCallback(() => {
    setState((prev) => ({
      ...prev,
      isPlaying: !prev.isPlaying,
    }));
  }, []);

  const handleStop = useCallback(() => {
    setState((prev) => ({
      ...prev,
      isPlaying: false,
      currentFrame: 0,
    }));
  }, []);

  const handleAddKeyframe = useCallback(() => {
    if (!selectedBone) return;

    const newKeyframe: Keyframe = {
      boneId: selectedBone.id,
      frame: state.currentFrame,
      position: selectedBone.position,
      rotation: selectedBone.rotation,
      scale: selectedBone.scale,
    };

    setState((prev) => ({
      ...prev,
      keyframes: [
        ...prev.keyframes.filter(
          (k) => !(k.boneId === selectedBone.id && k.frame === state.currentFrame)
        ),
        newKeyframe,
      ],
    }));
  }, [selectedBone, state.currentFrame]);

  const handlePropertyChange = useCallback(
    (property: 'position' | 'rotation' | 'scale', axis: string, value: number) => {
      setState((prev) => ({
        ...prev,
        skeleton: prev.skeleton.map((b) =>
          b.id === state.selectedBone
            ? {
                ...b,
                [property]: {
                  ...(b[property] as any),
                  [axis]: value,
                },
              }
            : b
        ),
      }));
    },
    [state.selectedBone]
  );

  const handleFrameChange = useCallback((frame: number) => {
    setState((prev) => ({
      ...prev,
      currentFrame: Math.min(Math.max(0, frame), prev.totalFrames - 1),
    }));
  }, []);

  return (
    <div className="flex flex-col h-screen bg-slate-900 text-gray-100">
      {/* Toolbar */}
      <div className="bg-slate-800 border-b border-slate-700 px-4 py-3 flex items-center justify-between">
        <div className="text-lg font-semibold">Animation Editor - Character.nif</div>

        <div className="flex items-center gap-2">
          <select
            value={state.mode}
            onChange={(e) =>
              setState((prev) => ({
                ...prev,
                mode: e.target.value as any,
              }))
            }
            className="px-3 py-1 bg-slate-700 text-sm rounded border border-slate-600 focus:outline-none"
          >
            <option value="edit">Edit Mode</option>
            <option value="paint">Paint Weights</option>
            <option value="ik">IK Mode</option>
          </select>

          <div className="w-px h-6 bg-slate-700"></div>

          <button className="p-2 hover:bg-slate-700 rounded-lg transition">
            <Settings size={20} />
          </button>
        </div>
      </div>

      {/* Main content - three panel layout */}
      <div className="flex flex-1 gap-0 overflow-hidden">
        {/* Left Panel - Skeleton Hierarchy */}
        <div className="w-56 bg-slate-800 border-r border-slate-700 flex flex-col overflow-hidden">
          <div className="p-3 border-b border-slate-700">
            <div className="text-xs font-semibold text-slate-400 mb-2">SKELETON</div>
            <input
              type="text"
              placeholder="Search bones..."
              className="w-full px-2 py-1 bg-slate-700 text-gray-100 text-sm rounded border border-slate-600 focus:outline-none focus:border-blue-500"
            />
          </div>

          <div className="flex-1 overflow-y-auto">{renderBoneTree()}</div>

          <div className="p-2 border-t border-slate-700 flex gap-1">
            <button className="flex-1 flex items-center justify-center gap-1 px-2 py-1 bg-blue-600 hover:bg-blue-700 rounded text-sm transition">
              <Plus size={16} />
              Bone
            </button>
            <button className="flex-1 flex items-center justify-center gap-1 px-2 py-1 bg-red-600 hover:bg-red-700 rounded text-sm transition">
              <Trash2 size={16} />
            </button>
          </div>
        </div>

        {/* Center Panel - 3D Viewport */}
        <div className="flex-1 bg-slate-900 border-r border-slate-700 flex flex-col overflow-hidden">
          {/* Viewport Toolbar */}
          <div className="bg-slate-800 border-b border-slate-700 px-3 py-2 flex items-center gap-2">
            <select
              value={state.viewportMode}
              onChange={(e) =>
                setState((prev) => ({
                  ...prev,
                  viewportMode: e.target.value as any,
                }))
              }
              className="px-2 py-1 bg-slate-700 text-xs rounded border border-slate-600 focus:outline-none"
            >
              <option value="wireframe">Wireframe</option>
              <option value="shaded">Shaded</option>
              <option value="xray">X-Ray</option>
            </select>

            <button className="p-1 hover:bg-slate-700 rounded transition">
              <Grid3x3 size={16} />
            </button>
            <button className="p-1 hover:bg-slate-700 rounded transition">
              <Maximize size={16} />
            </button>

            <div className="flex-1"></div>

            <div className="text-xs text-slate-400">
              Frame: {state.currentFrame} / {state.totalFrames}
            </div>
          </div>

          {/* Viewport */}
          <div
            ref={viewportRef}
            className="flex-1 bg-gradient-to-br from-slate-700 to-slate-900 flex items-center justify-center relative overflow-hidden"
          >
            {/* Mock 3D character with skeleton overlay */}
            <div className="relative w-40 h-56 flex items-center justify-center">
              {/* Character silhouette */}
              <div className="absolute w-32 h-40 rounded-lg bg-gradient-to-b from-slate-600 to-slate-700 opacity-40"></div>

              {/* Skeleton visualization */}
              <svg className="absolute inset-0 w-full h-full" style={{ pointerEvents: 'none' }}>
                {/* Spine chain */}
                <line
                  x1="50%"
                  y1="30%"
                  x2="50%"
                  y2="50%"
                  stroke="#3b82f6"
                  strokeWidth="2"
                />
                <line
                  x1="50%"
                  y1="50%"
                  x2="50%"
                  y2="65%"
                  stroke="#3b82f6"
                  strokeWidth="2"
                />

                {/* Arms */}
                <line
                  x1="50%"
                  y1="45%"
                  x2="25%"
                  y2="50%"
                  stroke="#10b981"
                  strokeWidth="2"
                />
                <line
                  x1="50%"
                  y1="45%"
                  x2="75%"
                  y2="50%"
                  stroke="#10b981"
                  strokeWidth="2"
                />

                {/* Legs */}
                <line
                  x1="45%"
                  y1="65%"
                  x2="35%"
                  y2="85%"
                  stroke="#ec4899"
                  strokeWidth="2"
                />
                <line
                  x1="55%"
                  y1="65%"
                  x2="65%"
                  y2="85%"
                  stroke="#ec4899"
                  strokeWidth="2"
                />

                {/* Bone joints */}
                {[
                  { cx: '50%', cy: '30%', label: 'Head' },
                  { cx: '50%', cy: '45%', label: 'Spine' },
                  { cx: '50%', cy: '65%', label: 'Pelvis' },
                  { cx: '25%', cy: '50%', label: 'LA' },
                  { cx: '75%', cy: '50%', label: 'RA' },
                  { cx: '35%', cy: '85%', label: 'LL' },
                  { cx: '65%', cy: '85%', label: 'RL' },
                ].map((joint, idx) => (
                  <g key={idx}>
                    <circle
                      cx={joint.cx}
                      cy={joint.cy}
                      r="4"
                      fill={state.selectedBone === `bone-${joint.label.toLowerCase()}` ? '#f59e0b' : '#60a5fa'}
                      strokeWidth="1"
                      stroke="white"
                    />
                  </g>
                ))}
              </svg>

              {/* Gizmo controls (mock) */}
              <div className="absolute bottom-2 left-2 flex gap-1">
                <button className="p-1 bg-slate-700 hover:bg-slate-600 rounded text-xs">
                  <Move size={14} />
                </button>
                <button className="p-1 bg-slate-700 hover:bg-slate-600 rounded text-xs">
                  <RotateCw size={14} />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Right Panel - Properties */}
        <div className="w-64 bg-slate-800 border-l border-slate-700 flex flex-col overflow-hidden">
          <div className="p-3 border-b border-slate-700">
            <div className="text-sm font-semibold">
              Bone: {selectedBone?.name || 'None'}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-3 py-3 space-y-4">
            {selectedBone && (
              <>
                {/* Position */}
                <div>
                  <label className="text-xs font-semibold text-slate-400 block mb-2">
                    Position
                  </label>
                  <div className="space-y-1">
                    {(['x', 'y', 'z'] as const).map((axis) => (
                      <div key={axis} className="flex items-center gap-2">
                        <label className="w-6 text-xs text-slate-400">{axis.toUpperCase()}</label>
                        <input
                          type="number"
                          step="0.1"
                          value={(selectedBone.position as any)[axis]}
                          onChange={(e) =>
                            handlePropertyChange('position', axis, parseFloat(e.target.value))
                          }
                          className="flex-1 px-2 py-1 bg-slate-700 text-xs rounded border border-slate-600 focus:outline-none"
                        />
                      </div>
                    ))}
                  </div>
                </div>

                {/* Rotation */}
                <div>
                  <label className="text-xs font-semibold text-slate-400 block mb-2">
                    Rotation (deg)
                  </label>
                  <div className="space-y-1">
                    {(['x', 'y', 'z'] as const).map((axis) => (
                      <div key={axis} className="flex items-center gap-2">
                        <label className="w-6 text-xs text-slate-400">{axis.toUpperCase()}</label>
                        <input
                          type="range"
                          min="-180"
                          max="180"
                          step="1"
                          value={(selectedBone.rotation as any)[axis]}
                          onChange={(e) =>
                            handlePropertyChange('rotation', axis, parseFloat(e.target.value))
                          }
                          className="flex-1 cursor-pointer"
                        />
                        <span className="w-12 text-xs text-right">
                          {((selectedBone.rotation as any)[axis] || 0).toFixed(1)}°
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Bone Length */}
                <div>
                  <label className="text-xs font-semibold text-slate-400 block mb-2">
                    Length
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={selectedBone.length}
                    className="w-full px-2 py-1 bg-slate-700 text-xs rounded border border-slate-600 focus:outline-none"
                  />
                </div>

                {/* Parent */}
                <div>
                  <label className="text-xs font-semibold text-slate-400 block mb-2">
                    Parent
                  </label>
                  <select className="w-full px-2 py-1 bg-slate-700 text-xs rounded border border-slate-600 focus:outline-none">
                    <option>None</option>
                    {state.skeleton.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                </div>
              </>
            )}
          </div>

          {/* Keyframe button */}
          <div className="p-2 border-t border-slate-700">
            <button
              onClick={handleAddKeyframe}
              className="w-full px-3 py-2 bg-blue-600 hover:bg-blue-700 rounded text-sm transition"
            >
              + Add Keyframe
            </button>
          </div>
        </div>
      </div>

      {/* Bottom Panel - Timeline */}
      <div className="h-40 bg-slate-800 border-t border-slate-700 flex flex-col overflow-hidden">
        <div className="px-4 py-2 bg-slate-700 border-b border-slate-600 flex items-center gap-2">
          <button
            onClick={handlePlayPause}
            className="p-1 hover:bg-slate-600 rounded transition"
          >
            {state.isPlaying ? <Pause size={18} /> : <Play size={18} />}
          </button>
          <button onClick={handleStop} className="p-1 hover:bg-slate-600 rounded transition">
            <RotateCcw size={18} />
          </button>

          <div className="flex-1 px-2">
            <div className="text-sm font-semibold">
              Frame {state.currentFrame} / {state.totalFrames}
            </div>
          </div>

          <button onClick={handleAddKeyframe} className="px-3 py-1 bg-green-600 hover:bg-green-700 rounded text-xs transition">
            Add Keyframe
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-3">
          {/* Timeline scrubber */}
          <div className="mb-4">
            <input
              type="range"
              min="0"
              max={state.totalFrames - 1}
              value={state.currentFrame}
              onChange={(e) => handleFrameChange(parseInt(e.target.value))}
              className="w-full cursor-pointer"
            />
          </div>

          {/* Keyframe tracks */}
          <div className="space-y-2">
            {state.skeleton.slice(0, 3).map((bone) => {
              const boneKeyframes = state.keyframes.filter((k) => k.boneId === bone.id);
              return (
                <div key={bone.id} className="flex items-center gap-2">
                  <div className="w-24 text-xs truncate text-slate-400">{bone.name}</div>
                  <div className="flex-1 h-6 bg-slate-700 rounded relative border border-slate-600">
                    {/* Keyframe markers */}
                    {boneKeyframes.map((kf) => (
                      <div
                        key={`${bone.id}-${kf.frame}`}
                        className="absolute w-2 h-2 bg-yellow-400 rounded-full"
                        style={{
                          left: `${(kf.frame / state.totalFrames) * 100}%`,
                          top: '50%',
                          transform: 'translate(-50%, -50%)',
                        }}
                      />
                    ))}
                    {/* Current frame indicator */}
                    <div
                      className="absolute w-0.5 h-full bg-red-500"
                      style={{
                        left: `${(state.currentFrame / state.totalFrames) * 100}%`,
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnimationEditor;
