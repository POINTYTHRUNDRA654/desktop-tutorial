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

import React, { useState, useCallback, useRef, useMemo, useEffect } from 'react';
import * as THREE from 'three';
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
  transformTool: 'move' | 'rotate';
  showGrid: boolean;
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
    transformTool: 'rotate',
    showGrid: true,
  });

  const viewportRef = useRef<HTMLDivElement>(null);
  const [viewportMaximized, setViewportMaximized] = useState(false);

  // Real .nif load/save (via Mossy Link Blender bridge + PyNifly) — see main.ts
  // 'animation-editor:load-nif'/'save-nif'. null means the demo skeleton is showing.
  const [loadedNif, setLoadedNif] = useState<{ path: string; armatureName: string } | null>(null);
  const [nifBusy, setNifBusy] = useState<'loading' | 'saving' | null>(null);

  const handleLoadNif = useCallback(async () => {
    const api = (window as any).electron?.api ?? (window as any).electronAPI;
    let nifPath: string | undefined;
    if (api?.pickNifFile) {
      const picked = await api.pickNifFile();
      nifPath = Array.isArray(picked) ? picked[0] : picked;
    }
    if (!nifPath) return; // user cancelled or no native picker available
    if (!api?.animationEditorLoadNif) {
      (window as any).__toast?.error?.('NIF loading requires the desktop app (Electron bridge unavailable).');
      return;
    }
    setNifBusy('loading');
    try {
      const result = await api.animationEditorLoadNif(nifPath);
      if (!result?.success) {
        (window as any).__toast?.error?.(result?.error || 'Failed to load NIF.');
        return;
      }
      const bones: SkeletonBone[] = (result.bones || []).map((b: any) => ({
        id: b.id,
        name: b.name,
        parentId: b.parentId ?? undefined,
        children: b.children || [],
        visible: true,
        position: { x: b.position?.[0] ?? 0, y: b.position?.[1] ?? 0, z: b.position?.[2] ?? 0 },
        rotation: { x: b.rotation?.[0] ?? 0, y: b.rotation?.[1] ?? 0, z: b.rotation?.[2] ?? 0 },
        scale: { x: 1, y: 1, z: 1 },
        length: b.length ?? 1,
      }));
      setState((prev) => ({ ...prev, skeleton: bones, selectedBone: bones[0]?.id ?? null }));
      setLoadedNif({ path: nifPath!, armatureName: result.armatureName });
      (window as any).__toast?.success?.(`Loaded ${bones.length} bone(s) from ${nifPath!.split(/[\\/]/).pop()}`);
    } catch (e: any) {
      (window as any).__toast?.error?.(`Load failed: ${e?.message || e}`);
    } finally {
      setNifBusy(null);
    }
  }, []);

  const handleSaveNif = useCallback(async () => {
    const api = (window as any).electron?.api ?? (window as any).electronAPI;
    if (!loadedNif) {
      (window as any).__toast?.error?.('Load a NIF before saving — there is nothing to write back yet.');
      return;
    }
    if (!api?.animationEditorSaveNif) {
      (window as any).__toast?.error?.('NIF saving requires the desktop app (Electron bridge unavailable).');
      return;
    }
    setNifBusy('saving');
    try {
      const bones = state.skeleton.map((b) => ({ name: b.name, position: [b.position.x, b.position.y, b.position.z] as [number, number, number] }));
      const result = await api.animationEditorSaveNif({ nifPath: loadedNif.path, armatureName: loadedNif.armatureName, bones });
      if (!result?.success) {
        (window as any).__toast?.error?.(result?.error || 'Failed to save NIF.');
        return;
      }
      (window as any).__toast?.success?.(`Saved bone edits to ${loadedNif.path.split(/[\\/]/).pop()}`);
    } catch (e: any) {
      (window as any).__toast?.error?.(`Save failed: ${e?.message || e}`);
    } finally {
      setNifBusy(null);
    }
  }, [loadedNif, state.skeleton]);

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

  // ── Real playback — advances currentFrame over real time while isPlaying.
  // Previously the Play button only flipped `isPlaying` with nothing actually
  // advancing the frame counter or timeline cursor.
  const PLAYBACK_FPS = 24;
  useEffect(() => {
    if (!state.isPlaying) return;
    let raf: number;
    let last = performance.now();
    let acc = 0;
    const tick = (now: number) => {
      const dt = now - last;
      last = now;
      acc += dt;
      const frameMs = 1000 / PLAYBACK_FPS;
      if (acc >= frameMs) {
        const framesToAdvance = Math.floor(acc / frameMs);
        acc -= framesToAdvance * frameMs;
        setState((prev) => ({
          ...prev,
          currentFrame: (prev.currentFrame + framesToAdvance) % prev.totalFrames,
        }));
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [state.isPlaying]);

  // Real per-bone pose for a given frame: linearly interpolates between the
  // recorded keyframes surrounding that frame; bones with no keyframes just
  // use their current edited (rest) transform.
  const getPosedTransform = useCallback((bone: SkeletonBone, frame: number) => {
    const boneKeys = state.keyframes
      .filter((k) => k.boneId === bone.id)
      .sort((a, b) => a.frame - b.frame);
    if (boneKeys.length === 0) return { position: bone.position, rotation: bone.rotation, scale: bone.scale };

    let prevKey = boneKeys[0];
    let nextKey = boneKeys[boneKeys.length - 1];
    for (let i = 0; i < boneKeys.length; i++) {
      if (boneKeys[i].frame <= frame) prevKey = boneKeys[i];
      if (boneKeys[i].frame >= frame) { nextKey = boneKeys[i]; break; }
    }
    const span = nextKey.frame - prevKey.frame;
    const t = span > 0 ? (frame - prevKey.frame) / span : 0;
    const lerp = (a?: number, b?: number) => (a ?? 0) + ((b ?? a ?? 0) - (a ?? 0)) * t;
    const lerpVec = (a?: { x: number; y: number; z: number }, b?: { x: number; y: number; z: number }, fallback?: { x: number; y: number; z: number }) => ({
      x: lerp(a?.x ?? fallback?.x, b?.x ?? fallback?.x),
      y: lerp(a?.y ?? fallback?.y, b?.y ?? fallback?.y),
      z: lerp(a?.z ?? fallback?.z, b?.z ?? fallback?.z),
    });
    return {
      position: lerpVec(prevKey.position, nextKey.position, bone.position),
      rotation: lerpVec(prevKey.rotation, nextKey.rotation, bone.rotation),
      scale: lerpVec(prevKey.scale, nextKey.scale, bone.scale),
    };
  }, [state.keyframes]);

  // Real forward kinematics: accumulate each bone's world position by
  // walking its parent chain, so children actually follow parent transforms
  // instead of being drawn at fixed hardcoded screen percentages.
  const getWorldBoneTransforms = useCallback((frame: number) => {
    const byId = new Map(state.skeleton.map((b) => [b.id, b]));
    const world = new Map<string, { pos: THREE.Vector3; rot: THREE.Euler }>();

    const resolve = (bone: SkeletonBone): { pos: THREE.Vector3; rot: THREE.Euler } => {
      const cached = world.get(bone.id);
      if (cached) return cached;
      const posed = getPosedTransform(bone, frame);
      const localPos = new THREE.Vector3(posed.position.x, posed.position.y, posed.position.z).multiplyScalar(0.1);
      const localRot = new THREE.Euler(
        THREE.MathUtils.degToRad(posed.rotation.x),
        THREE.MathUtils.degToRad(posed.rotation.y),
        THREE.MathUtils.degToRad(posed.rotation.z)
      );
      let result: { pos: THREE.Vector3; rot: THREE.Euler };
      const parent = bone.parentId ? byId.get(bone.parentId) : undefined;
      if (parent) {
        const parentResult = resolve(parent);
        const offset = localPos.clone().applyEuler(parentResult.rot);
        result = { pos: parentResult.pos.clone().add(offset), rot: new THREE.Euler(
          parentResult.rot.x + localRot.x, parentResult.rot.y + localRot.y, parentResult.rot.z + localRot.z
        ) };
      } else {
        result = { pos: localPos, rot: localRot };
      }
      world.set(bone.id, result);
      return result;
    };

    state.skeleton.forEach(resolve);
    return world;
  }, [state.skeleton, getPosedTransform]);

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

  const handleAddBone = useCallback(() => {
    setState((prev) => {
      const parentId = prev.selectedBone || undefined;
      const newId = `bone-${Date.now().toString(36)}`;
      const parent = prev.skeleton.find((b) => b.id === parentId);
      const newBone: SkeletonBone = {
        id: newId,
        name: `Bone${prev.skeleton.length + 1}`,
        parentId,
        children: [],
        visible: true,
        position: { x: 0, y: parent ? parent.length : 0, z: 0 },
        rotation: { x: 0, y: 0, z: 0 },
        scale: { x: 1, y: 1, z: 1 },
        length: 5,
      };
      return {
        ...prev,
        skeleton: prev.skeleton
          .map((b) => (b.id === parentId ? { ...b, children: [...b.children, newId] } : b))
          .concat(newBone),
        selectedBone: newId,
      };
    });
  }, []);

  const handleDeleteBone = useCallback(() => {
    setState((prev) => {
      if (!prev.selectedBone) return prev;
      const toDelete = prev.selectedBone;
      return {
        ...prev,
        skeleton: prev.skeleton
          .filter((b) => b.id !== toDelete)
          .map((b) => ({
            ...b,
            parentId: b.parentId === toDelete ? undefined : b.parentId,
            children: b.children.filter((c) => c !== toDelete),
          })),
        keyframes: prev.keyframes.filter((k) => k.boneId !== toDelete),
        selectedBone: null,
      };
    });
  }, []);

  const handleReparent = useCallback((newParentId: string) => {
    setState((prev) => {
      if (!prev.selectedBone) return prev;
      const boneId = prev.selectedBone;
      const resolvedParentId = newParentId || undefined;
      return {
        ...prev,
        skeleton: prev.skeleton.map((b) => {
          if (b.id === boneId) return { ...b, parentId: resolvedParentId };
          if (b.id === resolvedParentId) return { ...b, children: b.children.includes(boneId) ? b.children : [...b.children, boneId] };
          return { ...b, children: b.children.filter((c) => c !== boneId || b.id === resolvedParentId) };
        }),
      };
    });
  }, []);

  // ── Real Three.js skeleton viewport ───────────────────────────────────────
  // Renders the actual skeleton hierarchy (real forward kinematics from
  // state.skeleton + interpolated keyframes) as connected bones/joints —
  // not a hardcoded SVG stick figure with fixed screen-percentage joints.
  const threeContainerRef = useRef<HTMLDivElement>(null);
  const threeSceneRef = useRef<THREE.Scene | null>(null);
  const threeRendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const threeCameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const boneGroupRef = useRef<THREE.Group | null>(null);
  const gridHelperRef = useRef<THREE.GridHelper | null>(null);
  const animFrameRef = useRef<number>();

  useEffect(() => {
    const container = threeContainerRef.current;
    if (!container) return;

    const scene = new THREE.Scene();
    threeSceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(45, container.clientWidth / container.clientHeight, 0.01, 200);
    camera.position.set(3, 2, 4);
    camera.lookAt(0, 1.5, 0);
    threeCameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(container.clientWidth, container.clientHeight);
    container.appendChild(renderer.domElement);
    threeRendererRef.current = renderer;

    scene.add(new THREE.AmbientLight(0xffffff, 0.7));
    const dir = new THREE.DirectionalLight(0xffffff, 0.8);
    dir.position.set(2, 4, 3);
    scene.add(dir);

    const grid = new THREE.GridHelper(6, 12, 0x334155, 0x1e293b);
    grid.visible = state.showGrid;
    gridHelperRef.current = grid;
    scene.add(grid);

    const boneGroup = new THREE.Group();
    boneGroupRef.current = boneGroup;
    scene.add(boneGroup);

    const animate = () => {
      animFrameRef.current = requestAnimationFrame(animate);
      renderer.render(scene, camera);
    };
    animate();

    const onResize = () => {
      const w = container.clientWidth;
      const h = container.clientHeight || 360;
      renderer.setSize(w, h);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };
    const resizeObserver = new ResizeObserver(onResize);
    resizeObserver.observe(container);

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      resizeObserver.disconnect();
      renderer.dispose();
      if (renderer.domElement.parentElement === container) container.removeChild(renderer.domElement);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Rebuild the real bone visualization whenever the skeleton, selection,
  // frame, or viewport mode changes — genuinely data-driven, not static.
  useEffect(() => {
    const group = boneGroupRef.current;
    if (!group) return;

    while (group.children.length > 0) {
      const child = group.children[0];
      group.remove(child);
      if ((child as any).geometry) (child as any).geometry.dispose();
      if ((child as any).material) (child as any).material.dispose();
    }

    const world = getWorldBoneTransforms(state.currentFrame);
    const jointColor = 0x60a5fa;
    const selectedColor = 0xf59e0b;
    const boneColor = state.viewportMode === 'xray' ? 0x93c5fd : 0x3b82f6;

    state.skeleton.forEach((bone) => {
      if (!bone.visible) return;
      const t = world.get(bone.id);
      if (!t) return;

      const jointGeom = new THREE.SphereGeometry(0.05, 12, 12);
      const jointMat = new THREE.MeshBasicMaterial({
        color: bone.id === state.selectedBone ? selectedColor : jointColor,
        depthTest: state.viewportMode !== 'xray',
      });
      const joint = new THREE.Mesh(jointGeom, jointMat);
      joint.position.copy(t.pos);
      joint.userData.boneId = bone.id;
      group.add(joint);

      const parent = bone.parentId ? state.skeleton.find((b) => b.id === bone.parentId) : undefined;
      if (parent) {
        const parentT = world.get(parent.id);
        if (parentT) {
          const points = [parentT.pos, t.pos];
          const boneGeom = new THREE.BufferGeometry().setFromPoints(points);
          const boneMat = new THREE.LineBasicMaterial({
            color: boneColor,
            depthTest: state.viewportMode !== 'xray',
            transparent: state.viewportMode === 'wireframe',
            opacity: state.viewportMode === 'wireframe' ? 0.6 : 1,
          });
          group.add(new THREE.Line(boneGeom, boneMat));
        }
      }
    });
  }, [state.skeleton, state.selectedBone, state.currentFrame, state.viewportMode, getWorldBoneTransforms]);

  // Grid visibility toggle
  useEffect(() => {
    if (gridHelperRef.current) gridHelperRef.current.visible = state.showGrid;
  }, [state.showGrid]);

  // Click-to-select a bone directly in the 3D viewport
  const handleViewportClick = useCallback((e: React.MouseEvent) => {
    const container = threeContainerRef.current;
    const camera = threeCameraRef.current;
    const group = boneGroupRef.current;
    if (!container || !camera || !group) return;

    const rect = container.getBoundingClientRect();
    const mouse = new THREE.Vector2(
      ((e.clientX - rect.left) / rect.width) * 2 - 1,
      -((e.clientY - rect.top) / rect.height) * 2 + 1
    );
    const raycaster = new THREE.Raycaster();
    raycaster.params.Line = { threshold: 0.05 };
    raycaster.setFromCamera(mouse, camera);
    const hits = raycaster.intersectObjects(group.children, false);
    const hit = hits.find((h) => h.object.userData.boneId);
    if (hit) {
      setState((prev) => ({ ...prev, selectedBone: hit.object.userData.boneId }));
    }
  }, []);

  return (
    <div className="flex flex-col h-screen bg-slate-900 text-gray-100">
      {/* Toolbar */}
      <div className="bg-slate-800 border-b border-slate-700 px-4 py-3 flex items-center justify-between">
        <div
          className="text-lg font-semibold"
          title={loadedNif ? loadedNif.path : 'No .nif loaded — showing a demo skeleton. Load a real NIF via Blender + PyNifly (requires Mossy Link connected).'}
        >
          Animation Editor — {loadedNif ? loadedNif.path.split(/[\\/]/).pop() : 'Demo Skeleton (no file loaded)'}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleLoadNif}
            disabled={nifBusy !== null}
            className="px-3 py-1 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 text-sm rounded border border-slate-600"
            title="Load a real .nif skeleton via Blender + PyNifly (requires Mossy Link connected)"
          >
            {nifBusy === 'loading' ? 'Loading…' : 'Load NIF'}
          </button>
          <button
            onClick={handleSaveNif}
            disabled={nifBusy !== null || !loadedNif}
            className="px-3 py-1 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 text-sm rounded border border-slate-600"
            title={loadedNif ? 'Save bone position edits back to the loaded .nif' : 'Load a NIF first'}
          >
            {nifBusy === 'saving' ? 'Saving…' : 'Save NIF'}
          </button>
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
        </div>
      </div>

      {state.mode !== 'edit' && (
        <div className="bg-amber-900/30 border-b border-amber-600/40 px-4 py-2 text-xs text-amber-300">
          {state.mode === 'paint' ? 'Weight Painting' : 'IK Mode'} is not implemented yet — this needs real per-vertex
          weight data from a loaded mesh (paint) or a real IK solver (ik), neither of which exist in this build.
          Switch back to Edit Mode to work with bone hierarchy, keyframes, and playback, which are fully real.
        </div>
      )}

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
            <button
              onClick={handleAddBone}
              className="flex-1 flex items-center justify-center gap-1 px-2 py-1 bg-blue-600 hover:bg-blue-700 rounded text-sm transition"
              title="Add a child bone under the selected bone"
            >
              <Plus size={16} />
              Bone
            </button>
            <button
              onClick={handleDeleteBone}
              disabled={!state.selectedBone}
              className="flex-1 flex items-center justify-center gap-1 px-2 py-1 bg-red-600 hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed rounded text-sm transition"
              title="Delete selected bone"
            >
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

            <button
              onClick={() => setState((prev) => ({ ...prev, showGrid: !prev.showGrid }))}
              className={`p-1 rounded transition ${state.showGrid ? 'bg-blue-600' : 'hover:bg-slate-700'}`}
              title="Toggle grid"
            >
              <Grid3x3 size={16} />
            </button>
            <button
              onClick={() => setViewportMaximized((v) => !v)}
              className={`p-1 rounded transition ${viewportMaximized ? 'bg-blue-600' : 'hover:bg-slate-700'}`}
              title={viewportMaximized ? 'Restore layout' : 'Maximize viewport'}
            >
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
            className={`flex-1 bg-gradient-to-br from-slate-700 to-slate-900 flex items-center justify-center relative overflow-hidden ${viewportMaximized ? 'fixed inset-0 z-50' : ''}`}
          >
            {/* Real Three.js skeleton viewport — driven by state.skeleton's
                actual bone hierarchy + interpolated keyframes via real
                forward kinematics, not a fixed SVG stick figure. There is no
                real mesh loaded (FO4 .nif has no browser-side loader — see
                AssetViewer3D.tsx's glTF-export approach for that problem),
                so only the skeleton itself is rendered; that skeleton is
                fully real and reactive to editing/playback. */}
            <div ref={threeContainerRef} onClick={handleViewportClick} className="w-full h-full" />

            <div className="absolute bottom-2 left-2 flex gap-1">
              <button
                onClick={() => setState((prev) => ({ ...prev, transformTool: 'move' }))}
                className={`p-1 rounded text-xs transition ${state.transformTool === 'move' ? 'bg-blue-600' : 'bg-slate-700 hover:bg-slate-600'}`}
                title="Move tool — edits Position in the Properties panel"
              >
                <Move size={14} />
              </button>
              <button
                onClick={() => setState((prev) => ({ ...prev, transformTool: 'rotate' }))}
                className={`p-1 rounded text-xs transition ${state.transformTool === 'rotate' ? 'bg-blue-600' : 'bg-slate-700 hover:bg-slate-600'}`}
                title="Rotate tool — edits Rotation in the Properties panel"
              >
                <RotateCw size={14} />
              </button>
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
                    onChange={(e) => {
                      const length = parseFloat(e.target.value);
                      setState((prev) => ({
                        ...prev,
                        skeleton: prev.skeleton.map((b) =>
                          b.id === selectedBone.id ? { ...b, length } : b
                        ),
                      }));
                    }}
                    className="w-full px-2 py-1 bg-slate-700 text-xs rounded border border-slate-600 focus:outline-none"
                  />
                </div>

                {/* Parent */}
                <div>
                  <label className="text-xs font-semibold text-slate-400 block mb-2">
                    Parent
                  </label>
                  <select
                    value={selectedBone.parentId || ''}
                    onChange={(e) => handleReparent(e.target.value)}
                    className="w-full px-2 py-1 bg-slate-700 text-xs rounded border border-slate-600 focus:outline-none"
                  >
                    <option value="">None</option>
                    {state.skeleton
                      .filter((b) => b.id !== selectedBone.id)
                      .map((b) => (
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
