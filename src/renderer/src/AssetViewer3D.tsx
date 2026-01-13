import React, { useState, useEffect, useRef } from 'react';
import { Box, RotateCw, Eye, Info, Layers, Triangle, Upload } from 'lucide-react';

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
  const [asset, setAsset] = useState<AssetInfo | null>(null);
  const [rotation, setRotation] = useState({ x: 0, y: 0 });
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

  const loadAsset = async (file: File) => {
    setLoading(true);
    
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch('http://localhost:21337/3d/load', {
        method: 'POST',
        body: formData
      });

      if (response.ok) {
        const data = await response.json();
        setAsset(data);
      } else {
        throw new Error('Failed to load asset');
      }
    } catch (error) {
      console.error('Failed to load asset:', error);
      alert('Could not load asset. Make sure Desktop Bridge is running.');
    } finally {
      setLoading(false);
    }
  };

  const renderScene = () => {
    const canvas = canvasRef.current;
    if (!canvas || !asset) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

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
    const scale = 50;

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
    if (e.buttons === 1) { // Left mouse button
      setRotation(prev => ({
        x: prev.x + e.movementY * 0.01,
        y: prev.y + e.movementX * 0.01
      }));
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      loadAsset(file);
    }
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
            <label className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded cursor-pointer flex items-center gap-2 transition-colors">
              <Upload className="w-4 h-4" />
              Load .NIF
              <input
                type="file"
                accept=".nif"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>
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
            className="cursor-move"
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
              onClick={() => setRotation({ x: 0, y: 0 })}
              className="w-full px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded flex items-center gap-2 transition-colors"
            >
              <RotateCw className="w-4 h-4" />
              Reset
            </button>
          </div>

          {/* Help Text */}
          <div className="absolute bottom-4 left-4 bg-slate-900/95 border border-slate-700 rounded px-3 py-2 text-xs text-slate-400">
            Click and drag to rotate • Scroll to zoom
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
                    <span className="text-blue-400">Z:</span>
                    <span className="text-white">{asset.bounds.z.toFixed(2)}m</span>
                  </div>
                </div>
              </div>

              <div className="bg-slate-900 border border-slate-700 rounded-xl p-4">
                <h4 className="font-bold text-white mb-3 text-sm">Materials</h4>
                <div className="space-y-1">
                  {asset.materials.map((mat, idx) => (
                    <div key={idx} className="text-xs text-slate-300 bg-slate-950 px-2 py-1 rounded font-mono">
                      {mat}
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-blue-900/20 border border-blue-500/50 rounded-xl p-4">
                <h4 className="font-bold text-blue-300 mb-2 flex items-center gap-2 text-sm">
                  <Info className="w-4 h-4" />
                  Performance
                </h4>
                <div className="text-xs text-blue-200 space-y-1">
                  {asset.triangles < 10000 ? (
                    <p className="text-green-400">✓ Triangle count is excellent</p>
                  ) : asset.triangles < 20000 ? (
                    <p className="text-amber-400">⚠ Triangle count is acceptable</p>
                  ) : (
                    <p className="text-red-400">✗ Triangle count is high</p>
                  )}
                  
                  {asset.hasLOD ? (
                    <p className="text-green-400">✓ LOD models present</p>
                  ) : (
                    <p className="text-amber-400">⚠ No LOD models found</p>
                  )}
                  
                  {asset.collision ? (
                    <p className="text-green-400">✓ Collision mesh present</p>
                  ) : (
                    <p className="text-red-400">✗ No collision mesh</p>
                  )}
                </div>
              </div>
            </>
          ) : (
            <div className="bg-slate-900 border border-slate-700 rounded-xl p-4">
              <div className="flex items-start gap-2 text-slate-400 text-sm">
                <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="mb-2">Load a .NIF file to preview its 3D model.</p>
                  <p className="text-xs">Supports meshes, materials, collision, and LOD visualization.</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
