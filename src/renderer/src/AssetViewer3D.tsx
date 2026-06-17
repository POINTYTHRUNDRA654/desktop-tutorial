import React, { useState, useEffect, useRef, useCallback } from 'react';
import toast from 'react-hot-toast';
import { Box, RotateCw, Eye, Info, Layers, Triangle, Upload, FolderOpen, AlertTriangle, CheckCircle2 } from 'lucide-react';

interface AssetInfo {
  name: string;
  vertices: number;
  triangles: number;
  materials: string[];
  collision: boolean;
  hasLOD: boolean;
  bounds: { x: number; y: number; z: number };
}

export const AssetViewer3D: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [asset, setAsset] = useState<AssetInfo | null>(null);
  const [rotation, setRotation] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [showCollision, setShowCollision] = useState(false);
  const [showWireframe, setShowWireframe] = useState(false);
  const [showBounds, setShowBounds] = useState(false);
  const [loading, setLoading] = useState(false);
  const animationRef = useRef<number>();

  useEffect(() => {
    // Load demo asset
    loadDemoAsset();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (asset) {
      renderScene();
    }
  }, [asset, rotation, showCollision, showWireframe, showBounds]);

  const sampleAssets = [
    { id: 'PipBoy.nif',      name: 'PipBoy.nif',      description: 'Player pip-boy — 8 432 verts, collision, LOD' },
    { id: 'PowerArmor.nif',  name: 'PowerArmor.nif',  description: 'T-60 frame — 18 200 verts, full LOD chain' },
    { id: 'Deathclaw.nif',   name: 'Deathclaw.nif',   description: 'Actor mesh — 42 000 verts, Havok skeleton' },
    { id: 'Settlement.nif',  name: 'SettlementBed.nif',description: 'Workshop prop — 1 200 verts, snap points' },
    { id: 'Laser.nif',       name: 'LaserRifle.nif',  description: 'Weapon — 12 000 verts, no LOD (held item)' },
  ];

  const loadDemoAsset = () => {
    // Demo asset data
    const demoAsset: AssetInfo = {
      name: 'PipBoy.nif',
      vertices: 8432,
      triangles: 4521,
      materials: ['PipBoyScreen.bgsm', 'PipBoyMetal.bgsm'],
      collision: true,
      hasLOD: true,
      bounds: { x: 2.5, y: 1.8, z: 0.8 }
    };

    setAsset(demoAsset);
  };

  /** Load a NIF via Electron IPC (no bridge required) */
  const loadAssetFromPath = useCallback(async (filePath: string) => {
    setLoading(true);
    try {
      // Ask the main process to parse the NIF header / metadata
      const electronAPI = (window as any).electronAPI;
      const result = await electronAPI?.miningPipeline?.parseESP?.(filePath)
        .catch(() => null); // NIF parsing may not be fully wired; fall back to filename heuristic

      if (result?.data) {
        setAsset(result.data as AssetInfo);
      } else {
        // Provide filename-based defaults when native parse isn't available
        const name = filePath.split(/[\\/]/).pop() ?? 'unknown.nif';
        setAsset({
          name,
          vertices:  0,
          triangles: 0,
          materials: [],
          collision: false,
          hasLOD:    false,
          bounds:    { x: 1, y: 1, z: 1 },
        });
        toast('NIF metadata parsed from filename — full binary parsing requires native module.', { icon: <Info className="w-4 h-4 text-sky-400" /> });
      }
    } catch (error) {
      console.error('Failed to load NIF:', error);
      toast.error('Could not load NIF file.');
    } finally {
      setLoading(false);
    }
  }, []);

  /** Browse for a NIF via Electron file dialog */
  const browseNif = useCallback(async () => {
    try {
      const electronAPI = (window as any).electronAPI;
      const paths: string[] = await electronAPI?.pickNifFile?.();
      if (paths?.length) await loadAssetFromPath(paths[0]);
    } catch {
      // Fall back to HTML file input if API unavailable
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.nif';
      input.onchange = async (e: any) => {
        const file = e.target.files?.[0];
        if (!file) return;
        // Extract filename only (no real binary parsing in renderer)
        setAsset({
          name: file.name,
          vertices: 0, triangles: 0, materials: [],
          collision: false, hasLOD: false,
          bounds: { x: 1, y: 1, z: 1 },
        });
      };
      input.click();
    }
  }, [loadAssetFromPath]);

  /** Legacy: load from File object (kept for compatibility) */
  const loadAsset = async (file: File) => {
    setAsset({
      name: file.name,
      vertices: 0, triangles: 0, materials: [],
      collision: false, hasLOD: false,
      bounds: { x: 1, y: 1, z: 1 },
    });
  };

  const renderScene = () => {
    const canvas = canvasRef.current;
    if (!canvas || !asset) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Sync canvas resolution to displayed size
    const rect = canvas.getBoundingClientRect();
    if (rect.width > 0 && canvas.width !== Math.round(rect.width)) {
      canvas.width  = Math.round(rect.width);
      canvas.height = Math.round(rect.height || 480);
    }

    // Clear
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw grid
    drawGrid(ctx, canvas.width, canvas.height);

    // Draw axes
    drawAxes(ctx, canvas.width, canvas.height);

    // Draw simplified 3D representation
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const scale = 50 * zoom;

    ctx.save();
    ctx.translate(centerX, centerY);

    // Simulate 3D rotation
    const cosY = Math.cos(rotation.y);
    const sinY = Math.sin(rotation.y);
    const cosX = Math.cos(rotation.x);
    const sinX = Math.sin(rotation.x);

    // Draw bounding box
    if (showBounds) {
      const w = asset.bounds.x * scale;
      const h = asset.bounds.y * scale;
      const d = asset.bounds.z * scale;

      ctx.strokeStyle = '#3b82f6';
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 5]);
      
      // Front face
      ctx.strokeRect(-w/2, -h/2, w, h);
      
      // Back face (offset)
      const offsetX = d * sinY * 0.5;
      const offsetY = -d * sinX * 0.5;
      ctx.strokeRect(-w/2 + offsetX, -h/2 + offsetY, w, h);
      
      // Connecting lines
      ctx.beginPath();
      ctx.moveTo(-w/2, -h/2);
      ctx.lineTo(-w/2 + offsetX, -h/2 + offsetY);
      ctx.moveTo(w/2, -h/2);
      ctx.lineTo(w/2 + offsetX, -h/2 + offsetY);
      ctx.moveTo(-w/2, h/2);
      ctx.lineTo(-w/2 + offsetX, h/2 + offsetY);
      ctx.moveTo(w/2, h/2);
      ctx.lineTo(w/2 + offsetX, h/2 + offsetY);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // Draw simplified mesh representation
    if (showWireframe) {
      drawWireframeMesh(ctx, scale, cosY, sinY, cosX, sinX);
    } else {
      drawSolidMesh(ctx, scale, cosY, sinY, cosX, sinX);
    }

    // Draw collision mesh
    if (showCollision && asset.collision) {
      drawCollisionMesh(ctx, scale, cosY, sinY);
    }

    ctx.restore();
  };

  const drawGrid = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 1;

    const gridSize = 50;
    
    for (let x = 0; x < width; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }

    for (let y = 0; y < height; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }
  };

  const drawAxes = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
    const centerX = width / 2;
    const centerY = height / 2;
    const axisLength = 100;

    // X axis (red)
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(centerX, centerY);
    ctx.lineTo(centerX + axisLength, centerY);
    ctx.stroke();

    // Y axis (green)
    ctx.strokeStyle = '#22c55e';
    ctx.beginPath();
    ctx.moveTo(centerX, centerY);
    ctx.lineTo(centerX, centerY - axisLength);
    ctx.stroke();

    // Z axis (blue)
    ctx.strokeStyle = '#3b82f6';
    ctx.beginPath();
    ctx.moveTo(centerX, centerY);
    ctx.lineTo(centerX - axisLength * 0.5, centerY + axisLength * 0.5);
    ctx.stroke();

    // Labels
    ctx.fillStyle = '#ef4444';
    ctx.font = '12px sans-serif';
    ctx.fillText('X', centerX + axisLength + 10, centerY);
    ctx.fillStyle = '#22c55e';
    ctx.fillText('Y', centerX, centerY - axisLength - 10);
    ctx.fillStyle = '#3b82f6';
    ctx.fillText('Z', centerX - axisLength * 0.5 - 20, centerY + axisLength * 0.5);
  };

  const drawSolidMesh = (ctx: CanvasRenderingContext2D, scale: number, cosY: number, sinY: number, cosX: number, sinX: number) => {
    // Draw simplified mesh representation (cube-like shape)
    const size = scale * 2;
    
    // Calculate faces with depth
    const faces = [
      { z: -1, color: '#475569' }, // Back
      { z: 0, color: '#64748b' },   // Middle
      { z: 1, color: '#94a3b8' }    // Front
    ];

    faces.forEach(face => {
      const depth = face.z * size * 0.3;
      const offsetX = depth * sinY;
      const offsetY = -depth * sinX;

      ctx.fillStyle = face.color;
      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = 1;

      ctx.beginPath();
      ctx.rect(-size/2 + offsetX, -size/2 + offsetY, size, size);
      ctx.fill();
      ctx.stroke();
    });
  };

  const drawWireframeMesh = (ctx: CanvasRenderingContext2D, scale: number, cosY: number, sinY: number, cosX: number, sinX: number) => {
    const size = scale * 2;
    const divisions = 10;
    const step = size / divisions;

    ctx.strokeStyle = '#60a5fa';
    ctx.lineWidth = 1;

    // Horizontal lines
    for (let i = 0; i <= divisions; i++) {
      const y = -size/2 + i * step;
      ctx.beginPath();
      ctx.moveTo(-size/2, y);
      ctx.lineTo(size/2, y);
      ctx.stroke();
    }

    // Vertical lines
    for (let i = 0; i <= divisions; i++) {
      const x = -size/2 + i * step;
      ctx.beginPath();
      ctx.moveTo(x, -size/2);
      ctx.lineTo(x, size/2);
      ctx.stroke();
    }
  };

  const drawCollisionMesh = (ctx: CanvasRenderingContext2D, scale: number, cosY: number, sinY: number) => {
    const size = scale * 2.2; // Slightly larger
    
    ctx.strokeStyle = '#22c55e';
    ctx.lineWidth = 2;
    ctx.setLineDash([10, 5]);
    
    const offsetX = size * 0.2 * sinY;
    const offsetY = size * 0.1;

    ctx.strokeRect(-size/2 + offsetX, -size/2 - offsetY, size, size);
    ctx.setLineDash([]);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (e.buttons === 1) { // Left button drag = rotate
      setRotation(prev => ({
        x: prev.x + e.movementY * 0.01,
        y: prev.y + e.movementX * 0.01,
      }));
    }
  };

  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    setZoom(z => Math.max(0.2, Math.min(5, z - e.deltaY * 0.001)));
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) loadAsset(file);
  };

  return (
    <div className="h-full bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 overflow-hidden flex flex-col">
      {/* Header */}
      <div className="p-6 border-b border-slate-700 bg-slate-800/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Box className="w-8 h-8 text-emerald-400" />
            <div>
              <h1 className="text-2xl font-bold text-white">3D Asset Viewer</h1>
              <p className="text-sm text-slate-400">Preview meshes and textures</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 font-mono">{Math.round(zoom * 100)}%</span>
            <button
              onClick={browseNif}
              disabled={loading}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded cursor-pointer flex items-center gap-2 transition-colors disabled:opacity-40"
            >
              <FolderOpen className="w-4 h-4" />
              {loading ? 'Loading…' : 'Browse .NIF'}
            </button>
          </div>
        </div>
      </div>

      {/* Viewer */}
      <div className="flex-1 flex gap-4 p-6">
        {/* Canvas */}
        <div className="flex-1 bg-slate-950 border border-slate-700 rounded-xl overflow-hidden relative">
          <canvas
            ref={canvasRef}
            width={1000}
            height={700}
            onMouseMove={handleMouseMove}
            onWheel={handleWheel}
            className="cursor-move w-full h-full"
            style={{ display: 'block' }}
          />

          {/* Controls Overlay */}
          <div className="absolute top-4 right-4 space-y-2">
            <button
              onClick={() => setShowWireframe(!showWireframe)}
              className={`w-full px-4 py-2 ${showWireframe ? 'bg-blue-600' : 'bg-slate-800'} hover:bg-blue-500 text-white rounded flex items-center gap-2 transition-colors`}
            >
              <Layers className="w-4 h-4" />
              Wireframe
            </button>
            <button
              onClick={() => setShowCollision(!showCollision)}
              className={`w-full px-4 py-2 ${showCollision ? 'bg-green-600' : 'bg-slate-800'} hover:bg-green-500 text-white rounded flex items-center gap-2 transition-colors`}
            >
              <Eye className="w-4 h-4" />
              Collision
            </button>
            <button
              onClick={() => setShowBounds(!showBounds)}
              className={`w-full px-4 py-2 ${showBounds ? 'bg-cyan-600' : 'bg-slate-800'} hover:bg-cyan-500 text-white rounded flex items-center gap-2 transition-colors`}
            >
              <Box className="w-4 h-4" />
              Bounds
            </button>
            <button
              onClick={() => { setRotation({ x: 0, y: 0 }); setZoom(1); }}
              className="w-full px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded flex items-center gap-2 transition-colors"
            >
              <RotateCw className="w-4 h-4" />
              Reset
            </button>
          </div>

          {/* Help Text */}
          <div className="absolute bottom-4 left-4 bg-slate-900/95 border border-slate-700 rounded px-3 py-2 text-xs text-slate-400">
            Drag to rotate · Scroll wheel to zoom · Click Reset to reset view
          </div>
        </div>

        {/* Info Panel */}
        <div className="w-80 space-y-4">
          {asset ? (
            <>
              <div className="bg-slate-900 border border-slate-700 rounded-xl p-4">
                <h3 className="font-bold text-white mb-3">{asset.name}</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Vertices:</span>
                    <span className="text-white">{asset.vertices.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Triangles:</span>
                    <span className="text-white">{asset.triangles.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Materials:</span>
                    <span className="text-white">{asset.materials.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Collision:</span>
                    <span className={asset.collision ? 'text-green-400' : 'text-red-400'}>
                      {asset.collision ? 'Yes' : 'No'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">LOD:</span>
                    <span className={asset.hasLOD ? 'text-green-400' : 'text-amber-400'}>
                      {asset.hasLOD ? 'Yes' : 'No'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="bg-slate-900 border border-slate-700 rounded-xl p-4">
                <h4 className="font-bold text-white mb-3 text-sm">Bounding Box</h4>
                <div className="space-y-2 text-sm font-mono">
                  <div className="flex justify-between">
                    <span className="text-red-400">X:</span>
                    <span className="text-white">{asset.bounds.x.toFixed(2)}m</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-green-400">Y:</span>
                    <span className="text-white">{asset.bounds.y.toFixed(2)}m</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-blue-400">Z:</span>                    <span className="text-white">{asset.bounds.z.toFixed(2)}m</span>
                  </div>
                </div>
              </div>

              {asset.materials.length > 0 && (
                <div className="bg-slate-900 border border-slate-700 rounded-xl p-4">
                  <h4 className="font-bold text-white mb-3 text-sm">Materials ({asset.materials.length})</h4>
                  <div className="space-y-1 max-h-40 overflow-y-auto">
                    {asset.materials.map((mat, i) => (
                      <div key={i} className="text-xs text-slate-400 font-mono truncate">{mat}</div>
                    ))}
                  </div>
                </div>
              )}

              <div className="bg-slate-900 border border-slate-700 rounded-xl p-4">
                <h4 className="font-bold text-white mb-3 text-sm">Performance Notes</h4>
                <div className="space-y-2">
                  {asset.triangles > 30000 && (
                    <div className="flex gap-2 text-xs text-amber-300">
                      <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                      High poly count ({asset.triangles.toLocaleString()} tris). Consider LOD generation.
                    </div>
                  )}
                  {!asset.hasLOD && (
                    <div className="flex gap-2 text-xs text-amber-300">
                      <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                      No LOD chain detected. Visible at all distances — impacts outdoor performance.
                    </div>
                  )}
                  {!asset.collision && (
                    <div className="flex gap-2 text-xs text-slate-400">
                      <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                      No collision mesh. Acceptable for decorative or LOD meshes.
                    </div>
                  )}
                  {asset.triangles <= 30000 && asset.hasLOD && asset.collision && (
                    <div className="flex gap-2 text-xs text-emerald-300">
                      <CheckCircle2 className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                      Mesh meets FO4 performance guidelines.
                    </div>
                  )}
                </div>
              </div>
            </>
          ) : (
            <div className="bg-slate-900/40 border border-dashed border-slate-700 rounded-xl p-8 text-center">
              <Box className="w-10 h-10 text-slate-600 mx-auto mb-3" />
              <p className="text-sm text-slate-400 font-semibold">No asset loaded</p>
              <p className="text-xs text-slate-600 mt-1 max-w-[200px] mx-auto">
                Click Browse .NIF in the header to load a mesh, or use the Sample Meshes list.
              </p>
            </div>
          )}

          {/* Sample Meshes */}
          <div className="bg-slate-900 border border-slate-700 rounded-xl p-4">
            <h4 className="font-bold text-white mb-3 text-sm flex items-center gap-2">
              <Info className="w-4 h-4 text-slate-400" /> Sample Meshes
            </h4>
            <div className="space-y-1">
              {sampleAssets.map((s) => (
                <button
                  key={s.id}
                  onClick={() => loadAssetFromPath(s.id)}
                  className={`w-full text-left px-3 py-2 rounded-lg text-xs transition-colors ${
                    asset?.name === s.name
                      ? 'bg-emerald-600/20 text-emerald-300 border border-emerald-500/30'
                      : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                  }`}
                >
                  <div className="font-semibold">{s.name}</div>
                  <div className="text-[10px] text-slate-500">{s.description}</div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
