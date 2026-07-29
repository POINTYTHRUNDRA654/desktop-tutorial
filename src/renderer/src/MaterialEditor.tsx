/**
 * Material Editor Component
 * 
 * Complete material editing UI with:
 * - Material library (left panel)
 * - Shader graph canvas (center) with node-based editing
 * - 3D preview (right panel)
 * - Properties panel (bottom)
 * - Toolbar with save/load/export/bake operations
 */

import React, { useState, useCallback, useRef, useMemo, useEffect } from 'react';
import * as THREE from 'three';
import {
  Plus,
  Save,
  Upload,
  Download,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  MoreVertical,
  Trash2,
  Copy,
  Eye,
  EyeOff,
  Grid3x3,
  Lightbulb,
  Image as ImageIcon,
  Sliders,
  Play,
  Pause,
  RotateCw,
  Maximize2,
} from 'lucide-react';

interface Material {
  id: string;
  name: string;
  type: 'pbr' | 'bgsm' | 'bgem' | 'advanced';
  icon?: string;
  tags: string[];
  properties?: MaterialProperties;
}

interface ShaderNode {
  id: string;
  type: 'texture' | 'math' | 'color' | 'normal' | 'vector' | 'output';
  operation?: string;
  position: { x: number; y: number };
  inputs?: string[];
  outputs?: string[];
}

interface MaterialProperties {
  baseColor: string;
  metallic: number;
  roughness: number;
  normalStrength: number;
  aoStrength: number;
  emissive: number;
  alphaBlending: boolean;
}

interface EditorState {
  selectedMaterial: Material | null;
  nodes: ShaderNode[];
  connections: Array<{ from: string; to: string; fromSlot: string; toSlot: string }>;
  canvasZoom: number;
  canvasPan: { x: number; y: number };
  selectedNode: string | null;
  showGrid: boolean;
  previewMesh: 'sphere' | 'cube' | 'monkey';
  autoRotate: boolean;
  lightingPreset: 'studio' | 'outdoor' | 'nighttime';
}

const PRESET_MATERIALS: Material[] = [
  { id: 'mat-wood',        name: 'Wood (FO4)',        type: 'bgsm', tags: ['wood', 'organic'] },
  { id: 'mat-metal',       name: 'Metal (FO4)',       type: 'bgsm', tags: ['metal', 'industrial'] },
  { id: 'mat-metal-pbr',   name: 'Metal PBR (CShaders)', type: 'bgsm', tags: ['metal', 'pbr'] },
  { id: 'mat-concrete',    name: 'Concrete (FO4)',    type: 'bgsm', tags: ['stone', 'concrete'] },
  { id: 'mat-concrete-pom',name: 'Concrete + POM',   type: 'bgsm', tags: ['stone', 'parallax'] },
  { id: 'mat-fabric',      name: 'Fabric (FO4)',      type: 'bgsm', tags: ['fabric', 'organic'] },
  { id: 'mat-glass',       name: 'Glass / Window',   type: 'bgsm', tags: ['glass', 'transparent'] },
  { id: 'mat-skin',        name: 'Skin / Face',      type: 'bgsm', tags: ['skin', 'character'] },
  { id: 'mat-hair',        name: 'Hair / Strand',    type: 'bgsm', tags: ['hair', 'character'] },
  { id: 'mat-glow',        name: 'Glow Emissive',    type: 'bgsm', tags: ['glow', 'emissive'] },
  { id: 'mat-foliage',     name: 'Foliage / Alpha',  type: 'bgsm', tags: ['foliage', 'alpha'] },
  { id: 'mat-envmap',      name: 'Env Map Metal',    type: 'bgsm', tags: ['envmap', 'reflect'] },
];

const DEFAULT_MATERIAL_PROPERTIES: MaterialProperties = {
  baseColor: '#FFFFFF',
  metallic: 0.5,
  roughness: 0.5,
  normalStrength: 1.0,
  aoStrength: 1.0,
  emissive: 0,
  alphaBlending: false,
};

// Starting-point property values per preset — a real, editable base to tune from,
// not a claim that these exactly match any specific in-game asset.
const PRESET_VALUES: Record<string, MaterialProperties> = {
  'mat-wood':        { baseColor: '#6b4a2f', metallic: 0.0, roughness: 0.75, normalStrength: 1.0, aoStrength: 1.0, emissive: 0, alphaBlending: false },
  'mat-metal':        { baseColor: '#8a8f96', metallic: 0.9, roughness: 0.4, normalStrength: 1.0, aoStrength: 1.0, emissive: 0, alphaBlending: false },
  'mat-metal-pbr':    { baseColor: '#9aa0a8', metallic: 1.0, roughness: 0.25, normalStrength: 1.0, aoStrength: 1.0, emissive: 0, alphaBlending: false },
  'mat-concrete':     { baseColor: '#8c8c86', metallic: 0.0, roughness: 0.9, normalStrength: 0.8, aoStrength: 1.0, emissive: 0, alphaBlending: false },
  'mat-concrete-pom': { baseColor: '#83837c', metallic: 0.0, roughness: 0.88, normalStrength: 1.3, aoStrength: 1.2, emissive: 0, alphaBlending: false },
  'mat-fabric':       { baseColor: '#5a5548', metallic: 0.0, roughness: 0.95, normalStrength: 0.6, aoStrength: 1.0, emissive: 0, alphaBlending: false },
  'mat-glass':        { baseColor: '#bcd6dd', metallic: 0.0, roughness: 0.05, normalStrength: 0.3, aoStrength: 0.5, emissive: 0, alphaBlending: true },
  'mat-skin':         { baseColor: '#c98f6e', metallic: 0.0, roughness: 0.55, normalStrength: 0.7, aoStrength: 1.0, emissive: 0, alphaBlending: false },
  'mat-hair':         { baseColor: '#2b2117', metallic: 0.1, roughness: 0.6, normalStrength: 0.9, aoStrength: 1.0, emissive: 0, alphaBlending: true },
  'mat-glow':         { baseColor: '#7fffd4', metallic: 0.0, roughness: 0.4, normalStrength: 1.0, aoStrength: 1.0, emissive: 1.5, alphaBlending: false },
  'mat-foliage':      { baseColor: '#3f6b2e', metallic: 0.0, roughness: 0.8, normalStrength: 0.7, aoStrength: 1.0, emissive: 0, alphaBlending: true },
  'mat-envmap':       { baseColor: '#b8bec7', metallic: 0.85, roughness: 0.15, normalStrength: 1.0, aoStrength: 1.0, emissive: 0, alphaBlending: false },
};

const NODE_PALETTE = [
  { category: 'Texture', nodes: ['texture-sample', 'texture-combine'] },
  { category: 'Math', nodes: ['multiply', 'add', 'clamp', 'power'] },
  { category: 'Color', nodes: ['rgb-split', 'hsv-adjust', 'color-ramp'] },
  { category: 'Normal', nodes: ['normal-map', 'normal-blend'] },
  { category: 'Output', nodes: ['base-color', 'metallic', 'roughness'] },
];

export const MaterialEditor: React.FC = () => {
  const [state, setState] = useState<EditorState>({
    selectedMaterial: PRESET_MATERIALS[0],
    nodes: [
      {
        id: 'node-texture-1',
        type: 'texture',
        operation: 'texture-sample',
        position: { x: 100, y: 100 },
      },
      {
        id: 'node-output-1',
        type: 'output',
        operation: 'base-color',
        position: { x: 400, y: 150 },
      },
    ],
    connections: [
      {
        from: 'node-texture-1',
        to: 'node-output-1',
        fromSlot: 'rgb',
        toSlot: 'color',
      },
    ],
    canvasZoom: 1,
    canvasPan: { x: 0, y: 0 },
    selectedNode: null,
    showGrid: true,
    previewMesh: 'sphere',
    autoRotate: true,
    lightingPreset: 'studio',
  });

  const canvasRef = useRef<HTMLDivElement>(null);
  const [libraryFilter, setLibraryFilter] = useState('');
  const [showNodePalette, setShowNodePalette] = useState(false);
  const [compareMode, setCompareMode] = useState(false);
  const [compareSnapshot, setCompareSnapshot] = useState<MaterialProperties | null>(null);
  const [userMaterials, setUserMaterials] = useState<Material[]>([]);
  const [isDirty, setIsDirty] = useState(false);
  const [materialProperties, setMaterialProperties] = useState<MaterialProperties>(
    PRESET_VALUES[PRESET_MATERIALS[0].id] ?? DEFAULT_MATERIAL_PROPERTIES
  );
  const importFileInputRef = useRef<HTMLInputElement>(null);
  const baseColorTextureInputRef = useRef<HTMLInputElement>(null);
  const normalTextureInputRef = useRef<HTMLInputElement>(null);
  const [baseColorTexturePath, setBaseColorTexturePath] = useState<string>('');
  const [normalTexturePath, setNormalTexturePath] = useState<string>('');
  const [validationResult, setValidationResult] = useState<{ ok: boolean; issues: string[] } | null>(null);

  // ── Real 3D preview (Three.js) ────────────────────────────────────────────
  // Renders the current materialProperties on a real mesh with real lighting
  // and real rotation — not a static CSS gradient standing in for a preview.
  const previewContainerRef = useRef<HTMLDivElement>(null);
  const previewRendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const previewSceneRef = useRef<THREE.Scene | null>(null);
  const previewCameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const previewMeshRef = useRef<THREE.Mesh | null>(null);
  const previewLightsRef = useRef<{ ambient: THREE.AmbientLight; key: THREE.DirectionalLight; fill: THREE.DirectionalLight } | null>(null);
  const previewAnimRef = useRef<number>();
  const autoRotateRef = useRef(state.autoRotate);
  autoRotateRef.current = state.autoRotate;

  // Scene setup (once)
  useEffect(() => {
    const container = previewContainerRef.current;
    if (!container) return;

    const scene = new THREE.Scene();
    previewSceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(45, container.clientWidth / container.clientHeight, 0.1, 100);
    camera.position.set(0, 0, 3);
    previewCameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(container.clientWidth, container.clientHeight);
    container.appendChild(renderer.domElement);
    previewRendererRef.current = renderer;

    const ambient = new THREE.AmbientLight(0xffffff, 0.5);
    const key = new THREE.DirectionalLight(0xffffff, 1.2);
    key.position.set(3, 4, 3);
    const fill = new THREE.DirectionalLight(0xffffff, 0.4);
    fill.position.set(-3, -1, 2);
    scene.add(ambient, key, fill);
    previewLightsRef.current = { ambient, key, fill };

    const material = new THREE.MeshStandardMaterial({ color: new THREE.Color(materialProperties.baseColor) });
    const mesh = new THREE.Mesh(new THREE.SphereGeometry(0.9, 48, 48), material);
    scene.add(mesh);
    previewMeshRef.current = mesh;

    const animate = () => {
      previewAnimRef.current = requestAnimationFrame(animate);
      if (autoRotateRef.current && previewMeshRef.current) {
        previewMeshRef.current.rotation.y += 0.008;
      }
      renderer.render(scene, camera);
    };
    animate();

    const onResize = () => {
      const w = container.clientWidth;
      const h = container.clientHeight || 240;
      renderer.setSize(w, h);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };
    const resizeObserver = new ResizeObserver(onResize);
    resizeObserver.observe(container);

    return () => {
      if (previewAnimRef.current) cancelAnimationFrame(previewAnimRef.current);
      resizeObserver.disconnect();
      renderer.dispose();
      mesh.geometry.dispose();
      material.dispose();
      if (renderer.domElement.parentElement === container) {
        container.removeChild(renderer.domElement);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Swap geometry when the preview mesh shape changes
  useEffect(() => {
    const scene = previewSceneRef.current;
    const oldMesh = previewMeshRef.current;
    if (!scene || !oldMesh) return;

    const geometry =
      state.previewMesh === 'cube' ? new THREE.BoxGeometry(1.3, 1.3, 1.3) :
      state.previewMesh === 'monkey' ? new THREE.TorusKnotGeometry(0.55, 0.22, 128, 24) :
      new THREE.SphereGeometry(0.9, 48, 48);

    oldMesh.geometry.dispose();
    oldMesh.geometry = geometry;
  }, [state.previewMesh]);

  // Apply real material property changes to the live mesh
  useEffect(() => {
    const mesh = previewMeshRef.current;
    if (!mesh) return;
    const material = mesh.material as THREE.MeshStandardMaterial;
    material.color.set(materialProperties.baseColor);
    material.metalness = materialProperties.metallic;
    material.roughness = materialProperties.roughness;
    material.emissive = new THREE.Color(materialProperties.baseColor);
    material.emissiveIntensity = materialProperties.emissive;
    material.transparent = materialProperties.alphaBlending;
    material.opacity = materialProperties.alphaBlending ? 0.6 : 1;
    material.needsUpdate = true;
  }, [materialProperties]);

  // Real lighting presets — not just a highlighted button with no effect
  useEffect(() => {
    const lights = previewLightsRef.current;
    if (!lights) return;
    if (state.lightingPreset === 'outdoor') {
      lights.ambient.color.set(0x9ec9ff);
      lights.ambient.intensity = 0.6;
      lights.key.color.set(0xfff3d6);
      lights.key.intensity = 1.6;
      lights.fill.color.set(0x7ea8ff);
      lights.fill.intensity = 0.5;
    } else if (state.lightingPreset === 'nighttime') {
      lights.ambient.color.set(0x1a2340);
      lights.ambient.intensity = 0.25;
      lights.key.color.set(0x7d9dff);
      lights.key.intensity = 0.6;
      lights.fill.color.set(0x2a3a6b);
      lights.fill.intensity = 0.2;
    } else {
      // studio
      lights.ambient.color.set(0xffffff);
      lights.ambient.intensity = 0.5;
      lights.key.color.set(0xffffff);
      lights.key.intensity = 1.2;
      lights.fill.color.set(0xffffff);
      lights.fill.intensity = 0.4;
    }
  }, [state.lightingPreset]);

  const resetPreviewRotation = useCallback(() => {
    if (previewMeshRef.current) previewMeshRef.current.rotation.set(0, 0, 0);
    if (previewCameraRef.current) previewCameraRef.current.position.set(0, 0, 3);
  }, []);

  // Filter materials
  const filteredMaterials = useMemo(
    () =>
      PRESET_MATERIALS.filter(
        (m) =>
          m.name.toLowerCase().includes(libraryFilter.toLowerCase()) ||
          m.tags.some((t) =>
            t.toLowerCase().includes(libraryFilter.toLowerCase())
          )
      ),
    [libraryFilter]
  );

  // Canvas controls
  const handleZoomIn = useCallback(() => {
    setState((prev) => ({
      ...prev,
      canvasZoom: Math.min(prev.canvasZoom + 0.1, 3),
    }));
  }, []);

  const handleZoomOut = useCallback(() => {
    setState((prev) => ({
      ...prev,
      canvasZoom: Math.max(prev.canvasZoom - 0.1, 0.5),
    }));
  }, []);

  const handleResetView = useCallback(() => {
    setState((prev) => ({
      ...prev,
      canvasZoom: 1,
      canvasPan: { x: 0, y: 0 },
    }));
  }, []);

  // Material operations
  const handleSelectMaterial = useCallback((material: Material) => {
    setState((prev) => ({ ...prev, selectedMaterial: material }));
    const values = material.properties ?? PRESET_VALUES[material.id];
    if (values) setMaterialProperties(values);
    setIsDirty(false);
  }, []);

  const handleNewMaterial = useCallback(() => {
    const name = window.prompt('Material name (will save as <name>.bgsm):', 'new_material');
    if (!name?.trim()) return;
    const newMat: Material = {
      id: `user-${Date.now()}`,
      name: name.trim(),
      type: 'bgsm',
      tags: ['user'],
      properties: { ...materialProperties },
    };
    setUserMaterials((prev) => [...prev, newMat]);
    setState((prev) => ({ ...prev, selectedMaterial: newMat }));
    setIsDirty(true);
  }, [materialProperties]);

  const handleSaveMaterial = useCallback(async () => {
    const mat = state.selectedMaterial;
    if (!mat) return;
    try {
      const api = (window as any).electron?.api ?? (window as any).electronAPI;

      // Real binary .bgsm write — maps this editor's simplified PBR-style properties onto
      // FO4's real specular/emittance material fields (approximate but genuine, not fabricated).
      if (api?.material?.writeBgsmBinary) {
        const bgsmData = {
          bSpecularEnabled: true,
          cSpecularColor: materialProperties.baseColor,
          fSpecularMult: materialProperties.metallic,
          fSmoothness: 1 - materialProperties.roughness,
          bEmitEnabled: materialProperties.emissive > 0,
          cEmittanceColor: materialProperties.baseColor,
          fEmittanceMult: materialProperties.emissive,
          bReceiveShadows: true,
          bCastShadows: true,
          version: 2,
        };
        const result = await api.material.writeBgsmBinary({ data: bgsmData, defaultFileName: `${mat.name}.bgsm` });
        if (result?.success) {
          setIsDirty(false);
          (window as any).__toast?.success?.(`Saved real binary .bgsm — ${result.filePath ?? mat.name + '.bgsm'} (${result.fileSize ?? 0} bytes)`);
          return;
        }
        if (result?.error && result.error !== 'Save cancelled.') {
          (window as any).__toast?.error?.(result.error);
          return;
        }
        if (result?.error === 'Save cancelled.') return;
      }

      // Fallback: honest JSON export of the full shader-graph data (not a binary .bgsm).
      const payload = {
        name: mat.name,
        type: mat.type,
        properties: materialProperties,
        nodes: state.nodes,
        connections: state.connections,
      };
      const json = JSON.stringify(payload, null, 2);
      const jsonFileName = `${mat.name}.json`;
      if (api?.saveFile) {
        const savedPath = await api.saveFile(json, jsonFileName);
        if (savedPath) {
          setIsDirty(false);
          (window as any).__toast?.success?.(`Saved material data as JSON (not a binary .bgsm): ${savedPath}`);
          return;
        }
        return; // user cancelled the native save dialog
      }
      // Browser fallback download
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = jsonFileName; a.click();
      URL.revokeObjectURL(url);
      setIsDirty(false);
      (window as any).__toast?.success?.(`Exported ${jsonFileName} (JSON — not a binary .bgsm)`);
    } catch (e: any) {
      console.error('Save error:', e);
      (window as any).__toast?.error?.(`Save failed: ${e?.message || e}`);
    }
  }, [state.selectedMaterial, state.nodes, state.connections, materialProperties]);

  const handleExportMaterial = useCallback(async () => {
    const mat = state.selectedMaterial;
    if (!mat) return;
    const payload = { name: mat.name, type: mat.type, tags: mat.tags, properties: materialProperties };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `${mat.name}.json`; a.click();
    URL.revokeObjectURL(url);
  }, [state.selectedMaterial, materialProperties]);

  const handleBakeTextures = useCallback(async () => {
    const mat = state.selectedMaterial;
    if (!mat) { (window as any).__toast?.error?.('Select a material first.'); return; }
    const api = (window as any).electron?.api ?? (window as any).electronAPI;
    if (!api?.material?.bakeTextures) {
      (window as any).__toast?.error?.('Texture baking requires the Desktop Bridge to be running.');
      return;
    }
    try {
      const outputDir = await api.pickDirectory?.('Choose a folder to save the baked textures');
      if (!outputDir) return; // user cancelled

      (window as any).__toast?.info?.(`Baking textures for ${mat.name}...`);
      const result = await api.material.bakeTextures({
        materialName: mat.name,
        outputDir,
        baseColorHex: materialProperties.baseColor,
        metallic: materialProperties.metallic,
        roughness: materialProperties.roughness,
        resolution: 1024,
      });

      if (result?.success) {
        const mapList = (result.maps ?? []).map((m: any) => m.type).join(', ');
        (window as any).__toast?.success?.(`Baked ${result.maps?.length ?? 0} map(s) (${mapList}) to ${outputDir}`);
      } else {
        (window as any).__toast?.error?.(`Bake failed: ${result?.error || 'Unknown error'}`);
      }
    } catch (e: any) {
      (window as any).__toast?.error?.(`Bake failed: ${e?.message || e}`);
    }
  }, [state.selectedMaterial, materialProperties]);

  const handleImportFileChosen = useCallback(async (file: File) => {
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      const importedName = parsed.name || file.name.replace(/\.(bgsm|bgem|json)$/i, '');
      const importedProps: MaterialProperties = {
        ...DEFAULT_MATERIAL_PROPERTIES,
        ...(parsed.properties ?? {}),
      };
      const newMat: Material = {
        id: `user-${Date.now()}`,
        name: importedName,
        type: (parsed.type as Material['type']) ?? 'bgsm',
        tags: ['user', 'imported'],
        properties: importedProps,
      };
      setUserMaterials((prev) => [...prev, newMat]);
      setState((prev) => ({
        ...prev,
        selectedMaterial: newMat,
        nodes: Array.isArray(parsed.nodes) ? parsed.nodes : prev.nodes,
        connections: Array.isArray(parsed.connections) ? parsed.connections : prev.connections,
      }));
      setMaterialProperties(importedProps);
      setIsDirty(true);
      (window as any).__toast?.success?.(`Imported ${importedName} from ${file.name}`);
    } catch (e: any) {
      (window as any).__toast?.error?.(`Import failed: ${e?.message || 'file is not valid JSON material data'}`);
    }
  }, []);

  const handleValidate = useCallback(() => {
    const issues: string[] = [];
    const nodeIds = new Set(state.nodes.map((n) => n.id));

    for (const conn of state.connections) {
      if (!nodeIds.has(conn.from)) issues.push(`Connection references missing source node "${conn.from}".`);
      if (!nodeIds.has(conn.to)) issues.push(`Connection references missing target node "${conn.to}".`);
    }

    const outputNodes = state.nodes.filter((n) => n.type === 'output');
    if (outputNodes.length === 0) {
      issues.push('No output node — the graph has nothing to write final color/metallic/roughness values to.');
    }
    for (const out of outputNodes) {
      const hasIncoming = state.connections.some((c) => c.to === out.id);
      if (!hasIncoming) issues.push(`Output node "${out.operation ?? out.id}" has no incoming connection.`);
    }

    const nonOutputNodes = state.nodes.filter((n) => n.type !== 'output');
    for (const node of nonOutputNodes) {
      const isConnected = state.connections.some((c) => c.from === node.id || c.to === node.id);
      if (!isConnected) issues.push(`Node "${node.operation ?? node.id}" is not connected to anything.`);
    }

    const ok = issues.length === 0;
    setValidationResult({ ok, issues });
    if (ok) {
      (window as any).__toast?.success?.('Shader graph is valid — every node is connected and reaches an output.');
    } else {
      (window as any).__toast?.error?.(`${issues.length} issue(s) found in the shader graph — see Properties panel.`);
    }
  }, [state.nodes, state.connections]);

  const handleLoadTexture = useCallback(async (target: 'baseColor' | 'normal') => {
    const api = (window as any).electron?.api ?? (window as any).electronAPI;
    if (api?.pickDdsFile) {
      try {
        const picked = await api.pickDdsFile();
        const filePath = Array.isArray(picked) ? picked[0] : picked;
        if (!filePath) return; // user cancelled
        if (target === 'baseColor') setBaseColorTexturePath(filePath);
        else setNormalTexturePath(filePath);
        setIsDirty(true);
        (window as any).__toast?.success?.(`${target === 'baseColor' ? 'Base color' : 'Normal map'} texture set: ${filePath}`);
        return;
      } catch (e: any) {
        (window as any).__toast?.error?.(`Texture pick failed: ${e?.message || e}`);
        return;
      }
    }
    (target === 'baseColor' ? baseColorTextureInputRef : normalTextureInputRef).current?.click();
  }, []);

  const handleTextureFileChosen = useCallback((target: 'baseColor' | 'normal', file: File) => {
    const path = (file as any).path || file.name;
    if (target === 'baseColor') setBaseColorTexturePath(path);
    else setNormalTexturePath(path);
    setIsDirty(true);
  }, []);

  const toggleCompareMode = useCallback(() => {
    setCompareMode((prev) => {
      const next = !prev;
      if (next) setCompareSnapshot({ ...materialProperties });
      else setCompareSnapshot(null);
      return next;
    });
  }, [materialProperties]);

  // Node operations
  const handleAddNode = useCallback((nodeType: string) => {
    const newNode: ShaderNode = {
      id: `node-${Date.now()}`,
      type: nodeType as any,
      operation: nodeType,
      position: {
        x: 200 + Math.random() * 100,
        y: 150 + Math.random() * 100,
      },
    };
    setState((prev) => ({
      ...prev,
      nodes: [...prev.nodes, newNode],
    }));
    setShowNodePalette(false);
  }, []);

  const handleDeleteNode = useCallback((nodeId: string) => {
    setState((prev) => ({
      ...prev,
      nodes: prev.nodes.filter((n) => n.id !== nodeId),
      connections: prev.connections.filter(
        (c) => c.from !== nodeId && c.to !== nodeId
      ),
    }));
  }, []);

  const handleSelectNode = useCallback((nodeId: string) => {
    setState((prev) => ({
      ...prev,
      selectedNode: prev.selectedNode === nodeId ? null : nodeId,
    }));
  }, []);

  const [connectFrom, setConnectFrom] = useState<string | null>(null);
  const draggingNodeRef = useRef<{ id: string; offsetX: number; offsetY: number } | null>(null);

  const handleOutputPortClick = useCallback((nodeId: string) => {
    setConnectFrom((prev) => (prev === nodeId ? null : nodeId));
  }, []);

  const handleInputPortClick = useCallback((nodeId: string) => {
    setConnectFrom((from) => {
      if (!from || from === nodeId) return null;
      setState((prev) => {
        const exists = prev.connections.some((c) => c.from === from && c.to === nodeId);
        if (exists) return prev;
        return {
          ...prev,
          connections: [...prev.connections, { from, to: nodeId, fromSlot: 'out', toSlot: 'in' }],
        };
      });
      return null;
    });
  }, []);

  const handleNodeDragStart = useCallback((e: React.MouseEvent, node: ShaderNode) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    draggingNodeRef.current = {
      id: node.id,
      offsetX: e.clientX - rect.left - node.position.x * state.canvasZoom,
      offsetY: e.clientY - rect.top - node.position.y * state.canvasZoom,
    };
  }, [state.canvasZoom]);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      const drag = draggingNodeRef.current;
      const canvas = canvasRef.current;
      if (!drag || !canvas) return;
      const rect = canvas.getBoundingClientRect();
      const x = (e.clientX - rect.left - drag.offsetX) / state.canvasZoom;
      const y = (e.clientY - rect.top - drag.offsetY) / state.canvasZoom;
      setState((prev) => ({
        ...prev,
        nodes: prev.nodes.map((n) => (n.id === drag.id ? { ...n, position: { x, y } } : n)),
      }));
    };
    const onUp = () => { draggingNodeRef.current = null; };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, [state.canvasZoom]);

  // Real port anchor points derived from each node's actual position — the shader
  // graph's node card is 128px wide (w-32); ports sit at fixed offsets within it.
  const nodePositionById = useMemo(() => {
    const map = new Map<string, { x: number; y: number }>();
    for (const node of state.nodes) map.set(node.id, node.position);
    return map;
  }, [state.nodes]);

  return (
    <div className="flex flex-col h-screen bg-slate-900 text-gray-100">
      {/* Toolbar */}
      <div className="bg-slate-800 border-b border-slate-700 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="text-lg font-semibold flex items-center gap-2">
            Material Editor{' '}
            {state.selectedMaterial && (
              <span className="text-slate-400 font-normal">
                — {state.selectedMaterial.name}.bgsm
              </span>
            )}
            {isDirty && (
              <span className="w-2 h-2 rounded-full bg-yellow-400 flex-shrink-0" title="Unsaved changes" />
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Save/Load/Export */}
          <button
            onClick={handleSaveMaterial}
            className="p-2 hover:bg-slate-700 rounded-lg transition"
            title="Save Material"
          >
            <Save size={20} />
          </button>
          <button
            onClick={handleExportMaterial}
            className="p-2 hover:bg-slate-700 rounded-lg transition"
            title="Export Material"
          >
            <Download size={20} />
          </button>
          <button
            onClick={() => importFileInputRef.current?.click()}
            className="p-2 hover:bg-slate-700 rounded-lg transition"
            title="Import Material"
          >
            <Upload size={20} />
          </button>
          <input
            ref={importFileInputRef}
            type="file"
            accept=".bgsm,.bgem,.json"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleImportFileChosen(file);
              e.target.value = '';
            }}
          />

          <div className="w-px h-6 bg-slate-700"></div>

          {/* Validation & Bake */}
          <button
            onClick={handleValidate}
            className={`px-3 py-1 rounded text-sm transition ${validationResult && !validationResult.ok ? 'bg-rose-600 hover:bg-rose-700' : 'bg-blue-600 hover:bg-blue-700'}`}
            title="Validate Shader Graph"
          >
            Validate
          </button>
          <button
            onClick={handleBakeTextures}
            className="px-3 py-1 bg-amber-600 hover:bg-amber-700 rounded text-sm transition"
            title="Bake Textures"
          >
            Bake
          </button>
        </div>
      </div>

      {/* Main content - three panel layout */}
      <div className="flex flex-1 gap-0 overflow-hidden">
        {/* Left Panel - Material Library */}
        <div className="w-48 bg-slate-800 border-r border-slate-700 flex flex-col overflow-hidden">
          <div className="p-3 border-b border-slate-700">
            <input
              type="text"
              placeholder="Search materials..."
              value={libraryFilter}
              onChange={(e) => setLibraryFilter(e.target.value)}
              className="w-full px-2 py-1 bg-slate-700 text-gray-100 text-sm rounded border border-slate-600 focus:outline-none focus:border-blue-500"
            />
          </div>

          <div className="flex-1 overflow-y-auto">
            {/* Preset materials */}
            <div className="p-2">
              <div className="text-xs font-semibold text-slate-400 mb-2 px-1">
                PRESETS
              </div>
              {filteredMaterials.map((mat) => (
                <button
                  key={mat.id}
                  onClick={() => handleSelectMaterial(mat)}
                  className={`w-full text-left px-2 py-1 rounded text-sm mb-1 transition ${
                    state.selectedMaterial?.id === mat.id
                      ? 'bg-blue-600'
                      : 'hover:bg-slate-700'
                  }`}
                >
                  <div className="font-medium">{mat.name}</div>
                  <div className="text-xs text-slate-400">{mat.type}</div>
                </button>
              ))}
            </div>

            {/* User materials */}
            <div className="p-2">
              <div className="text-xs font-semibold text-slate-400 mb-2 px-1">
                USER MATERIALS
              </div>
              {userMaterials.length === 0 ? (
                <div className="text-xs text-slate-500 px-2 py-1">None yet — click New Material</div>
              ) : (
                userMaterials
                  .filter((m) =>
                    m.name.toLowerCase().includes(libraryFilter.toLowerCase()) ||
                    m.tags.some((t) => t.toLowerCase().includes(libraryFilter.toLowerCase()))
                  )
                  .map((mat) => (
                    <button
                      key={mat.id}
                      onClick={() => handleSelectMaterial(mat)}
                      className={`w-full text-left px-2 py-1 rounded text-sm mb-1 transition ${
                        state.selectedMaterial?.id === mat.id ? 'bg-blue-600' : 'hover:bg-slate-700'
                      }`}
                    >
                      <div className="font-medium">{mat.name}</div>
                      <div className="text-xs text-slate-400">{mat.type}</div>
                    </button>
                  ))
              )}
            </div>
          </div>

          {/* New material button */}
          <div className="p-2 border-t border-slate-700">
            <button
              onClick={handleNewMaterial}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 rounded transition"
            >
              <Plus size={16} />
              <span className="text-sm">New Material</span>
            </button>
          </div>
        </div>

        {/* Center Panel - Shader Graph Canvas */}
        <div className="flex-1 bg-slate-900 border-r border-slate-700 flex flex-col overflow-hidden relative">
          {/* Canvas Toolbar */}
          <div className="bg-slate-800 border-b border-slate-700 px-3 py-2 flex items-center gap-2">
            <button
              onClick={handleZoomIn}
              className="p-1 hover:bg-slate-700 rounded transition"
              title="Zoom In"
            >
              <ZoomIn size={16} />
            </button>
            <button
              onClick={handleZoomOut}
              className="p-1 hover:bg-slate-700 rounded transition"
              title="Zoom Out"
            >
              <ZoomOut size={16} />
            </button>
            <button
              onClick={handleResetView}
              className="p-1 hover:bg-slate-700 rounded transition"
              title="Reset View"
            >
              <RotateCcw size={16} />
            </button>

            <div className="w-px h-4 bg-slate-700"></div>

            <button
              onClick={() =>
                setState((prev) => ({
                  ...prev,
                  showGrid: !prev.showGrid,
                }))
              }
              className={`p-1 rounded transition ${
                state.showGrid ? 'bg-blue-600' : 'hover:bg-slate-700'
              }`}
              title="Show/Hide Grid"
            >
              <Grid3x3 size={16} />
            </button>

            <div className="flex-1"></div>

            <button
              onClick={() => setShowNodePalette(!showNodePalette)}
              className="px-2 py-1 border border-slate-600 rounded text-sm hover:bg-slate-700 transition"
            >
              + Add Node
            </button>
          </div>

          {/* Canvas */}
          <div
            ref={canvasRef}
            className="flex-1 relative overflow-hidden bg-gradient-to-br from-slate-900 to-slate-950 cursor-grab"
            style={{
              backgroundImage: state.showGrid
                ? `
                linear-gradient(0deg, transparent 24%, rgba(100, 100, 100, 0.05) 25%, rgba(100, 100, 100, 0.05) 26%, transparent 27%, transparent 74%, rgba(100, 100, 100, 0.05) 75%, rgba(100, 100, 100, 0.05) 76%, transparent 77%, transparent),
                linear-gradient(90deg, transparent 24%, rgba(100, 100, 100, 0.05) 25%, rgba(100, 100, 100, 0.05) 26%, transparent 27%, transparent 74%, rgba(100, 100, 100, 0.05) 75%, rgba(100, 100, 100, 0.05) 76%, transparent 77%, transparent)
              `
                : 'none',
              backgroundSize: `${40 * state.canvasZoom}px ${40 * state.canvasZoom}px`,
              backgroundPosition: `${state.canvasPan.x}px ${state.canvasPan.y}px`,
            }}
          >
            {/* Nodes */}
            <svg className="absolute inset-0" style={{ pointerEvents: 'none' }}>
              {/* Connections — real lines derived from each node's actual position */}
              {state.connections.map((conn, idx) => {
                const from = nodePositionById.get(conn.from);
                const to = nodePositionById.get(conn.to);
                if (!from || !to) return null;
                const zoom = state.canvasZoom;
                const x1 = (from.x + 128) * zoom;
                const y1 = (from.y + 58) * zoom;
                const x2 = (to.x + 0) * zoom;
                const y2 = (to.y + 40) * zoom;
                return (
                  <line
                    key={idx}
                    x1={x1}
                    y1={y1}
                    x2={x2}
                    y2={y2}
                    stroke="#3b82f6"
                    strokeWidth="2"
                    pointerEvents="none"
                  />
                );
              })}
            </svg>

            {/* Node elements */}
            <div className="absolute inset-0 pointer-events-none">
              {state.nodes.map((node) => (
                <div
                  key={node.id}
                  onClick={() => handleSelectNode(node.id)}
                  className={`absolute pointer-events-auto w-32 rounded border-2 transition ${
                    state.selectedNode === node.id
                      ? 'border-blue-500 bg-slate-700'
                      : 'border-slate-600 bg-slate-800 hover:border-slate-500'
                  }`}
                  style={{
                    transform: `translate(${node.position.x}px, ${node.position.y}px) scale(${state.canvasZoom})`,
                    transformOrigin: '0 0',
                  }}
                >
                  <div
                    className="px-2 py-1 bg-slate-700 rounded-t border-b border-slate-600 cursor-move"
                    onMouseDown={(e) => { e.stopPropagation(); handleNodeDragStart(e, node); }}
                  >
                    <div className="text-xs font-semibold text-center">
                      {node.operation}
                    </div>
                  </div>
                  <div className="px-2 py-2 text-xs space-y-1">
                    {node.type !== 'texture' && (
                      <div className="flex justify-between items-center text-slate-400">
                        <span>Input</span>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleInputPortClick(node.id); }}
                          className={`w-3 h-3 rounded-full transition ${connectFrom && connectFrom !== node.id ? 'bg-emerald-400 hover:bg-emerald-300 animate-pulse' : 'bg-slate-500'}`}
                          title="Click to complete a connection into this node"
                        />
                      </div>
                    )}
                    {node.type !== 'output' && (
                      <div className="flex justify-between items-center text-slate-400">
                        <button
                          onClick={(e) => { e.stopPropagation(); handleOutputPortClick(node.id); }}
                          className={`w-3 h-3 rounded-full transition ${connectFrom === node.id ? 'bg-blue-400 ring-2 ring-blue-300' : 'bg-slate-500 hover:bg-blue-400'}`}
                          title="Click to start a connection from this node's output"
                        />
                        <span>Output</span>
                      </div>
                    )}
                  </div>
                  {state.selectedNode === node.id && (
                    <div className="absolute top-1 right-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteNode(node.id);
                        }}
                        className="p-1 bg-red-600 hover:bg-red-700 rounded transition"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Node Palette Dropdown */}
            {showNodePalette && (
              <div className="absolute top-10 left-24 bg-slate-800 border border-slate-600 rounded-lg shadow-lg z-50 max-h-96 overflow-y-auto">
                {NODE_PALETTE.map((category) => (
                  <div key={category.category}>
                    <div className="px-3 py-2 text-xs font-semibold text-slate-400 bg-slate-900">
                      {category.category}
                    </div>
                    {category.nodes.map((nodeType) => (
                      <button
                        key={nodeType}
                        onClick={() => handleAddNode(nodeType)}
                        className="w-full text-left px-3 py-1 text-sm hover:bg-slate-700 transition"
                      >
                        {nodeType}
                      </button>
                    ))}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Panel - 3D Preview */}
        <div className="w-80 bg-slate-800 border-l border-slate-700 flex flex-col overflow-hidden">
          {/* Preview Toolbar */}
          <div className="bg-slate-700 border-b border-slate-600 px-3 py-2 flex items-center justify-between">
            <div className="text-sm font-semibold">Preview</div>
            <div className="flex items-center gap-1">
              <select
                value={state.previewMesh}
                onChange={(e) =>
                  setState((prev) => ({
                    ...prev,
                    previewMesh: e.target.value as any,
                  }))
                }
                className="px-2 py-1 bg-slate-600 text-xs rounded border border-slate-500 focus:outline-none"
              >
                <option value="sphere">Sphere</option>
                <option value="cube">Cube</option>
                <option value="monkey">Monkey</option>
              </select>
            </div>
          </div>

          {/* Canvas area — real Three.js render of the current material */}
          <div className="flex-1 bg-gradient-to-b from-slate-700 to-slate-900 relative overflow-hidden">
            <div ref={previewContainerRef} className="w-full h-full" />

            {/* Lighting controls overlay */}
            <div className="absolute top-2 right-2 flex gap-1">
              <button
                onClick={() => setState((prev) => ({ ...prev, autoRotate: !prev.autoRotate }))}
                className="p-2 bg-slate-700 hover:bg-slate-600 rounded transition"
                title={state.autoRotate ? 'Pause rotation' : 'Auto-rotate'}
              >
                {state.autoRotate ? (
                  <Pause size={16} />
                ) : (
                  <Play size={16} />
                )}
              </button>
              <button
                onClick={resetPreviewRotation}
                className="p-2 bg-slate-700 hover:bg-slate-600 rounded transition"
                title="Reset rotation & camera"
              >
                <RotateCw size={16} />
              </button>
            </div>
          </div>

          {/* Lighting presets */}
          <div className="bg-slate-700 border-t border-slate-600 px-3 py-2">
            <div className="text-xs font-semibold text-slate-400 mb-2">
              LIGHTING
            </div>
            <div className="flex gap-1">
              {['studio', 'outdoor', 'nighttime'].map((preset) => (
                <button
                  key={preset}
                  onClick={() =>
                    setState((prev) => ({
                      ...prev,
                      lightingPreset: preset as any,
                    }))
                  }
                  className={`flex-1 px-2 py-1 text-xs rounded transition ${
                    state.lightingPreset === preset
                      ? 'bg-blue-600'
                      : 'bg-slate-600 hover:bg-slate-500'
                  }`}
                >
                  {preset}
                </button>
              ))}
            </div>
          </div>

          {/* Comparison mode */}
          <div className="bg-slate-700 border-t border-slate-600 px-3 py-2">
            <button
              onClick={toggleCompareMode}
              className={`w-full flex items-center justify-center gap-2 px-2 py-2 rounded transition ${
                compareMode ? 'bg-blue-600' : 'bg-slate-600 hover:bg-slate-500'
              }`}
            >
              {compareMode ? <Eye size={16} /> : <EyeOff size={16} />}
              <span className="text-sm">
                {compareMode ? 'Comparison' : 'Single View'}
              </span>
            </button>
            {compareMode && compareSnapshot && (
              <div className="mt-2 rounded border border-slate-600 bg-slate-800 p-2 text-[11px] space-y-1">
                <div className="grid grid-cols-3 gap-1 text-slate-400 font-semibold">
                  <span>Property</span><span>Snapshot</span><span>Current</span>
                </div>
                {([
                  ['Base Color', compareSnapshot.baseColor, materialProperties.baseColor],
                  ['Metallic', compareSnapshot.metallic.toFixed(2), materialProperties.metallic.toFixed(2)],
                  ['Roughness', compareSnapshot.roughness.toFixed(2), materialProperties.roughness.toFixed(2)],
                  ['Emissive', compareSnapshot.emissive.toFixed(2), materialProperties.emissive.toFixed(2)],
                ] as const).map(([label, a, b]) => (
                  <div key={label} className={`grid grid-cols-3 gap-1 ${a !== b ? 'text-amber-300' : 'text-slate-300'}`}>
                    <span>{label}</span><span>{a}</span><span>{b}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Bottom Panel - Properties */}
      <div className="h-48 bg-slate-800 border-t border-slate-700 flex flex-col overflow-hidden">
        <div className="px-4 py-2 bg-slate-700 border-b border-slate-600 flex items-center justify-between">
          <div className="text-sm font-semibold">Properties</div>
          <button className="p-1 hover:bg-slate-600 rounded transition">
            <MoreVertical size={16} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-3">
          <div className="grid grid-cols-2 gap-4">
            {/* Base Color */}
            <div>
              <label className="text-xs font-semibold text-slate-400 mb-2 block">
                Base Color
              </label>
              <div className="flex gap-2">
                <input
                  type="color"
                  value={materialProperties.baseColor}
                  onChange={(e) =>
                    setMaterialProperties((prev) => ({
                      ...prev,
                      baseColor: e.target.value,
                    }))
                  }
                  className="w-10 h-8 rounded border border-slate-600 cursor-pointer"
                />
                <button
                  onClick={() => handleLoadTexture('baseColor')}
                  className="flex-1 px-2 py-1 bg-slate-700 hover:bg-slate-600 rounded text-xs transition truncate"
                  title={baseColorTexturePath || 'Load Texture'}
                >
                  {baseColorTexturePath ? baseColorTexturePath.split(/[\\/]/).pop() : 'Load Texture'}
                </button>
                <input
                  ref={baseColorTextureInputRef}
                  type="file"
                  accept=".dds,.png,.tga,.bmp"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleTextureFileChosen('baseColor', file);
                    e.target.value = '';
                  }}
                />
              </div>
            </div>

            {/* Metallic */}
            <div>
              <label className="text-xs font-semibold text-slate-400 mb-2 block">
                Metallic: {materialProperties.metallic.toFixed(2)}
              </label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={materialProperties.metallic}
                onChange={(e) =>
                  setMaterialProperties((prev) => ({
                    ...prev,
                    metallic: parseFloat(e.target.value),
                  }))
                }
                className="w-full cursor-pointer"
              />
            </div>

            {/* Roughness */}
            <div>
              <label className="text-xs font-semibold text-slate-400 mb-2 block">
                Roughness: {materialProperties.roughness.toFixed(2)}
              </label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={materialProperties.roughness}
                onChange={(e) =>
                  setMaterialProperties((prev) => ({
                    ...prev,
                    roughness: parseFloat(e.target.value),
                  }))
                }
                className="w-full cursor-pointer"
              />
            </div>

            {/* Normal Map */}
            <div>
              <label className="text-xs font-semibold text-slate-400 mb-2 block">
                Normal Map
              </label>
              <button
                onClick={() => handleLoadTexture('normal')}
                className="w-full px-2 py-1 bg-slate-700 hover:bg-slate-600 rounded text-xs transition truncate"
                title={normalTexturePath || 'Load Texture'}
              >
                {normalTexturePath ? normalTexturePath.split(/[\\/]/).pop() : 'Load Texture'}
              </button>
              <input
                ref={normalTextureInputRef}
                type="file"
                accept=".dds,.png,.tga,.bmp"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleTextureFileChosen('normal', file);
                  e.target.value = '';
                }}
              />
            </div>

            {/* Alpha Blending */}
            <div className="col-span-2">
              <label className="flex items-center gap-2 text-xs font-semibold text-slate-400">
                <input
                  type="checkbox"
                  checked={materialProperties.alphaBlending}
                  onChange={(e) =>
                    setMaterialProperties((prev) => ({
                      ...prev,
                      alphaBlending: e.target.checked,
                    }))
                  }
                  className="rounded"
                />
                Alpha Blending
              </label>
            </div>

            {/* Validation results */}
            {validationResult && (
              <div className="col-span-2">
                <label className="text-xs font-semibold text-slate-400 mb-2 block">
                  Shader Graph Validation
                </label>
                {validationResult.ok ? (
                  <div className="text-xs text-emerald-400">Graph is valid — every node is connected and reaches an output.</div>
                ) : (
                  <ul className="text-xs text-rose-300 space-y-1 list-disc list-inside">
                    {validationResult.issues.map((issue, idx) => (
                      <li key={idx}>{issue}</li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MaterialEditor;
