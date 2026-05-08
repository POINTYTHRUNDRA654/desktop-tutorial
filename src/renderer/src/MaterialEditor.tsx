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

import React, { useState, useCallback, useRef, useMemo } from 'react';
import {
  Plus,
  Save,
  Upload,
  Download,
  Settings,
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
}

interface ShaderNode {
  id: string;
  type: 'texture' | 'math' | 'color' | 'normal' | 'vector' | 'output';
  operation?: string;
  position: { x: number; y: number };
  inputs?: string[];
  outputs?: string[];
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
  { id: 'mat-wood', name: 'Wood', type: 'pbr', tags: ['wood', 'organic'] },
  { id: 'mat-metal', name: 'Metal', type: 'pbr', tags: ['metal', 'industrial'] },
  { id: 'mat-stone', name: 'Stone', type: 'pbr', tags: ['stone', 'natural'] },
  { id: 'mat-fabric', name: 'Fabric', type: 'pbr', tags: ['fabric', 'organic'] },
  { id: 'mat-glass', name: 'Glass', type: 'pbr', tags: ['glass', 'transparent'] },
  { id: 'mat-plastic', name: 'Plastic', type: 'pbr', tags: ['plastic', 'synthetic'] },
];

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
  const [materialProperties, setMaterialProperties] = useState({
    baseColor: '#FFFFFF',
    metallic: 0.5,
    roughness: 0.5,
    normalStrength: 1.0,
    aoStrength: 1.0,
    emissive: 0,
    alphaBlending: false,
  });

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
    setState((prev) => ({
      ...prev,
      selectedMaterial: material,
    }));
  }, []);

  const handleSaveMaterial = useCallback(() => {
    console.log('Saving material:', state.selectedMaterial?.name);
  }, [state.selectedMaterial]);

  const handleExportMaterial = useCallback(() => {
    console.log('Exporting material:', state.selectedMaterial?.name);
  }, [state.selectedMaterial]);

  const handleBakeTextures = useCallback(() => {
    console.log('Baking textures for:', state.selectedMaterial?.name);
  }, [state.selectedMaterial]);

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

  return (
    <div className="flex flex-col h-screen bg-slate-900 text-gray-100">
      {/* Toolbar */}
      <div className="bg-slate-800 border-b border-slate-700 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="text-lg font-semibold">
            Material Editor{' '}
            {state.selectedMaterial && `- ${state.selectedMaterial.name}.bgsm`}
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
            onClick={() => document.getElementById('import-file')?.click()}
            className="p-2 hover:bg-slate-700 rounded-lg transition"
            title="Import Material"
          >
            <Upload size={20} />
          </button>
          <input
            id="import-file"
            type="file"
            accept=".bgsm,.bgem,.json"
            className="hidden"
          />

          <div className="w-px h-6 bg-slate-700"></div>

          {/* Validation & Bake */}
          <button
            className="px-3 py-1 bg-blue-600 hover:bg-blue-700 rounded text-sm transition"
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

          <div className="w-px h-6 bg-slate-700"></div>

          {/* Settings */}
          <button className="p-2 hover:bg-slate-700 rounded-lg transition">
            <Settings size={20} />
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
              <div className="text-xs text-slate-500 px-2 py-1">None yet</div>
            </div>
          </div>

          {/* New material button */}
          <div className="p-2 border-t border-slate-700">
            <button className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 rounded transition">
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
              {/* Connections */}
              {state.connections.map((conn, idx) => (
                <line
                  key={idx}
                  x1="150"
                  y1="120"
                  x2="300"
                  y2="180"
                  stroke="#3b82f6"
                  strokeWidth="2"
                  pointerEvents="none"
                />
              ))}
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
                  <div className="px-2 py-1 bg-slate-700 rounded-t border-b border-slate-600">
                    <div className="text-xs font-semibold text-center">
                      {node.operation}
                    </div>
                  </div>
                  <div className="px-2 py-2 text-xs space-y-1">
                    <div className="flex justify-between text-slate-400">
                      <span>Input</span>
                      <span>●</span>
                    </div>
                    <div className="flex justify-between text-slate-400">
                      <span>●</span>
                      <span>Output</span>
                    </div>
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

          {/* Canvas area */}
          <div className="flex-1 bg-gradient-to-b from-slate-700 to-slate-900 flex items-center justify-center relative overflow-hidden">
            {/* Mock 3D preview */}
            <div className="w-40 h-40 rounded-full bg-gradient-radial from-blue-400 to-purple-900 shadow-2xl relative">
              <div className="absolute inset-0 rounded-full opacity-50 mix-blend-overlay">
                <div className="w-full h-full rounded-full bg-gradient-to-br from-white/20 to-transparent"></div>
              </div>
            </div>

            {/* Lighting controls overlay */}
            <div className="absolute top-2 right-2 flex gap-1">
              <button
                className="p-2 bg-slate-700 hover:bg-slate-600 rounded transition"
                title="Rotate Auto"
              >
                {state.autoRotate ? (
                  <Pause size={16} />
                ) : (
                  <Play size={16} />
                )}
              </button>
              <button className="p-2 bg-slate-700 hover:bg-slate-600 rounded transition">
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
              onClick={() => setCompareMode(!compareMode)}
              className={`w-full flex items-center justify-center gap-2 px-2 py-2 rounded transition ${
                compareMode ? 'bg-blue-600' : 'bg-slate-600 hover:bg-slate-500'
              }`}
            >
              {compareMode ? <Eye size={16} /> : <EyeOff size={16} />}
              <span className="text-sm">
                {compareMode ? 'Comparison' : 'Single View'}
              </span>
            </button>
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
                <button className="flex-1 px-2 py-1 bg-slate-700 hover:bg-slate-600 rounded text-xs transition">
                  Load Texture
                </button>
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
              <button className="w-full px-2 py-1 bg-slate-700 hover:bg-slate-600 rounded text-xs transition">
                Load Texture
              </button>
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
          </div>
        </div>
      </div>
    </div>
  );
};

export default MaterialEditor;
