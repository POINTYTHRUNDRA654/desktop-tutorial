import React, { useState, useEffect, useRef, useCallback } from 'react';
import toast from 'react-hot-toast';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { Box, RotateCw, Layers, Info, FolderOpen, AlertTriangle, CheckCircle2, ExternalLink } from 'lucide-react';

interface MeshStats {
  name: string;
  vertices: number;
  triangles: number;
  materials: string[];
  bounds: { x: number; y: number; z: number };
}

/**
 * Real 3D preview for FO4 meshes exported to glTF/GLB.
 *
 * FO4 uses NIF (Gamebryo/NetImmerse), which three.js cannot load directly — there is
 * no NIF loader for the web. The real path is: NifSkope (community fork) already
 * supports File > Export > glTF for FO4 meshes, and glTF is a standard three.js format.
 * So this viewer launches NifSkope on a picked .nif for that one manual export step,
 * then renders the resulting .gltf/.glb for real — actual geometry, actual vertex/
 * triangle counts, actual material names, not placeholder numbers.
 */
export const AssetViewer3D: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const loadedRootRef = useRef<THREE.Object3D | null>(null);
  const animationRef = useRef<number>();

  const [stats, setStats] = useState<MeshStats | null>(null);
  const [wireframe, setWireframe] = useState(false);
  const [loadingMesh, setLoadingMesh] = useState(false);
  const [loadedPath, setLoadedPath] = useState<string>('');
  const [nifSkopePath, setNifSkopePath] = useState<string>('');
  const [launchingNifSkope, setLaunchingNifSkope] = useState(false);

  // ── Three.js scene setup (once) ─────────────────────────────────────────────
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0f172a);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(50, container.clientWidth / container.clientHeight, 0.01, 1000);
    camera.position.set(2, 1.6, 2.5);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(container.clientWidth, container.clientHeight);
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controlsRef.current = controls;

    scene.add(new THREE.GridHelper(4, 20, 0x334155, 0x1e293b));
    scene.add(new THREE.AxesHelper(1.2));
    scene.add(new THREE.AmbientLight(0xffffff, 0.6));
    const dirLight = new THREE.DirectionalLight(0xffffff, 1.2);
    dirLight.position.set(3, 5, 2);
    scene.add(dirLight);
    const dirLight2 = new THREE.DirectionalLight(0xffffff, 0.4);
    dirLight2.position.set(-3, 2, -2);
    scene.add(dirLight2);

    const animate = () => {
      animationRef.current = requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    const onResize = () => {
      if (!container || !rendererRef.current || !cameraRef.current) return;
      const w = container.clientWidth;
      const h = container.clientHeight || 480;
      rendererRef.current.setSize(w, h);
      cameraRef.current.aspect = w / h;
      cameraRef.current.updateProjectionMatrix();
    };
    const resizeObserver = new ResizeObserver(onResize);
    resizeObserver.observe(container);

    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      resizeObserver.disconnect();
      controls.dispose();
      renderer.dispose();
      if (renderer.domElement.parentElement === container) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  // ── Load NifSkope path from settings ─────────────────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        const s = await window.electronAPI.getSettings();
        setNifSkopePath(String(s?.nifSkopePath || ''));
      } catch { /* settings unavailable — leave blank, button will prompt */ }
    })();
  }, []);

  // ── Apply wireframe toggle to whatever is currently loaded ───────────────────
  useEffect(() => {
    const root = loadedRootRef.current;
    if (!root) return;
    root.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      if (!mesh.isMesh) return;
      const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      for (const m of mats) {
        if (m && 'wireframe' in m) (m as THREE.MeshStandardMaterial).wireframe = wireframe;
      }
    });
  }, [wireframe]);

  const frameCameraOnObject = useCallback((object: THREE.Object3D) => {
    const camera = cameraRef.current;
    const controls = controlsRef.current;
    if (!camera || !controls) return;
    const box = new THREE.Box3().setFromObject(object);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z, 0.01);
    const dist = maxDim * 1.8;
    camera.position.set(center.x + dist, center.y + dist * 0.6, center.z + dist);
    camera.near = maxDim / 100;
    camera.far = maxDim * 100;
    camera.updateProjectionMatrix();
    controls.target.copy(center);
    controls.update();
  }, []);

  const applyLoadedScene = useCallback((gltfScene: THREE.Object3D, name: string) => {
    const scene = sceneRef.current;
    if (!scene) return;

    if (loadedRootRef.current) {
      scene.remove(loadedRootRef.current);
      loadedRootRef.current.traverse((obj) => {
        const mesh = obj as THREE.Mesh;
        if (mesh.isMesh) {
          mesh.geometry?.dispose();
          const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
          mats.forEach((m) => m?.dispose());
        }
      });
    }

    scene.add(gltfScene);
    loadedRootRef.current = gltfScene;

    // Compute REAL stats from the loaded geometry — no placeholder numbers.
    let vertices = 0;
    let triangles = 0;
    const materialNames = new Set<string>();
    gltfScene.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      if (!mesh.isMesh || !mesh.geometry) return;
      const geo = mesh.geometry;
      const posAttr = geo.getAttribute('position');
      if (posAttr) vertices += posAttr.count;
      if (geo.index) triangles += geo.index.count / 3;
      else if (posAttr) triangles += posAttr.count / 3;
      const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      mats.forEach((m) => { if (m?.name) materialNames.add(m.name); });
      const mats2 = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      mats2.forEach((m) => { if (m && 'wireframe' in m) (m as THREE.MeshStandardMaterial).wireframe = wireframe; });
    });

    const box = new THREE.Box3().setFromObject(gltfScene);
    const size = box.getSize(new THREE.Vector3());

    setStats({
      name,
      vertices,
      triangles: Math.round(triangles),
      materials: Array.from(materialNames),
      bounds: { x: size.x, y: size.y, z: size.z },
    });

    frameCameraOnObject(gltfScene);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [frameCameraOnObject]);

  /** Load a glTF/GLB by absolute path via the main process (readBinaryFile → base64 → ArrayBuffer). */
  const loadGltfFromPath = useCallback(async (filePath: string) => {
    setLoadingMesh(true);
    try {
      // Cast: readBinaryFile is declared on the electron/types.ts ElectronAPI contract
      // that preload actually implements, but this project also has a second, narrower
      // ElectronAPI in shared/types.ts merged onto Window — same split the pre-existing
      // pickNifFile call in this file already worked around the same way.
      const result = await (window.electronAPI as any).readBinaryFile(filePath);
      if (!result?.success || !result.data) {
        toast.error(result?.error || 'Could not read file.');
        return;
      }
      const binary = atob(result.data);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);

      const loader = new GLTFLoader();
      const name = filePath.split(/[\\/]/).pop() ?? filePath;
      loader.parse(
        bytes.buffer,
        '',
        (gltf) => {
          applyLoadedScene(gltf.scene, name);
          setLoadedPath(filePath);
          setLoadingMesh(false);
        },
        (err) => {
          console.error('[AssetViewer3D] glTF parse failed:', err);
          toast.error('Could not parse glTF/GLB — file may reference external resources not included in this single file (use .glb for a self-contained export).');
          setLoadingMesh(false);
        },
      );
    } catch (error) {
      console.error('[AssetViewer3D] Failed to load mesh:', error);
      toast.error('Could not load mesh file.');
      setLoadingMesh(false);
    }
  }, [applyLoadedScene]);

  /** Browse for a glTF/GLB via the native file dialog. */
  const browseGltf = useCallback(async () => {
    try {
      const paths = await (window.electronAPI as any).pickGltfFile();
      if (paths?.length) await loadGltfFromPath(paths[0]);
    } catch (error) {
      console.error('[AssetViewer3D] File picker failed:', error);
      toast.error('Could not open file picker.');
    }
  }, [loadGltfFromPath]);

  /** Pick a .nif and launch it in NifSkope so the user can export it to glTF/GLB. */
  const openInNifSkope = useCallback(async () => {
    if (!nifSkopePath) {
      toast.error('NifSkope path not configured — set it in Settings → External Tools first.', { duration: 5000 });
      return;
    }
    setLaunchingNifSkope(true);
    try {
      const paths = await (window.electronAPI as any).pickNifFile();
      if (!paths?.length) return;
      const res = await (window.electronAPI as any).launchToolWithFile(nifSkopePath, paths[0]);
      if (res?.success) {
        toast.success('NifSkope launched. In NifSkope: File → Export → glTF/GLB, then use "Load glTF/GLB" here to preview it.', { duration: 7000 });
      } else {
        toast.error(res?.error || 'Could not launch NifSkope.');
      }
    } catch (error) {
      console.error('[AssetViewer3D] Failed to launch NifSkope:', error);
      toast.error('Could not launch NifSkope.');
    } finally {
      setLaunchingNifSkope(false);
    }
  }, [nifSkopePath]);

  const resetView = useCallback(() => {
    if (loadedRootRef.current) frameCameraOnObject(loadedRootRef.current);
  }, [frameCameraOnObject]);

  return (
    <div className="h-full bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 overflow-hidden flex flex-col">
      {/* Header */}
      <div className="p-6 border-b border-slate-700 bg-slate-800/50">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <Box className="w-8 h-8 text-emerald-400" />
            <div>
              <h1 className="text-2xl font-bold text-white">3D Asset Viewer</h1>
              <p className="text-sm text-slate-400">Real glTF/GLB rendering — export NIFs from NifSkope first</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={openInNifSkope}
              disabled={launchingNifSkope}
              title={nifSkopePath ? `Launch ${nifSkopePath}` : 'Configure NifSkope path in Settings → External Tools'}
              className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white font-bold rounded cursor-pointer flex items-center gap-2 transition-colors disabled:opacity-40"
            >
              <ExternalLink className="w-4 h-4" />
              {launchingNifSkope ? 'Launching…' : 'Open .nif in NifSkope'}
            </button>
            <button
              onClick={browseGltf}
              disabled={loadingMesh}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded cursor-pointer flex items-center gap-2 transition-colors disabled:opacity-40"
            >
              <FolderOpen className="w-4 h-4" />
              {loadingMesh ? 'Loading…' : 'Load glTF/GLB'}
            </button>
          </div>
        </div>
        {!nifSkopePath && (
          <p className="text-xs text-amber-400 mt-2 flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5" /> NifSkope path isn't configured yet — set it in Settings → External Tools to enable one-click export launching.
          </p>
        )}
      </div>

      {/* Viewer */}
      <div className="flex-1 flex gap-4 p-6">
        {/* Canvas container */}
        <div className="flex-1 bg-slate-950 border border-slate-700 rounded-xl overflow-hidden relative">
          <div ref={containerRef} className="w-full h-full" />

          {/* Controls Overlay */}
          <div className="absolute top-4 right-4 space-y-2">
            <button
              onClick={() => setWireframe(!wireframe)}
              className={`w-full px-4 py-2 ${wireframe ? 'bg-blue-600' : 'bg-slate-800'} hover:bg-blue-500 text-white rounded flex items-center gap-2 transition-colors`}
            >
              <Layers className="w-4 h-4" />
              Wireframe
            </button>
            <button
              onClick={resetView}
              disabled={!stats}
              className="w-full px-4 py-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-white rounded flex items-center gap-2 transition-colors"
            >
              <RotateCw className="w-4 h-4" />
              Reset View
            </button>
          </div>

          {/* Help Text */}
          <div className="absolute bottom-4 left-4 bg-slate-900/95 border border-slate-700 rounded px-3 py-2 text-xs text-slate-400">
            Drag to orbit · Scroll to zoom · Right-drag to pan
          </div>
        </div>

        {/* Info Panel */}
        <div className="w-80 space-y-4">
          {stats ? (
            <>
              <div className="bg-slate-900 border border-slate-700 rounded-xl p-4">
                <h3 className="font-bold text-white mb-1 truncate">{stats.name}</h3>
                <p className="text-[10px] text-slate-600 truncate mb-3">{loadedPath}</p>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Vertices:</span>
                    <span className="text-white">{stats.vertices.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Triangles:</span>
                    <span className="text-white">{stats.triangles.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Materials:</span>
                    <span className="text-white">{stats.materials.length}</span>
                  </div>
                </div>
              </div>

              <div className="bg-slate-900 border border-slate-700 rounded-xl p-4">
                <h4 className="font-bold text-white mb-3 text-sm">Bounding Box</h4>
                <div className="space-y-2 text-sm font-mono">
                  <div className="flex justify-between">
                    <span className="text-red-400">X:</span>
                    <span className="text-white">{stats.bounds.x.toFixed(2)}m</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-green-400">Y:</span>
                    <span className="text-white">{stats.bounds.y.toFixed(2)}m</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-blue-400">Z:</span>
                    <span className="text-white">{stats.bounds.z.toFixed(2)}m</span>
                  </div>
                </div>
              </div>

              {stats.materials.length > 0 && (
                <div className="bg-slate-900 border border-slate-700 rounded-xl p-4">
                  <h4 className="font-bold text-white mb-3 text-sm">Materials ({stats.materials.length})</h4>
                  <div className="space-y-1 max-h-40 overflow-y-auto">
                    {stats.materials.map((mat, i) => (
                      <div key={i} className="text-xs text-slate-400 font-mono truncate">{mat}</div>
                    ))}
                  </div>
                </div>
              )}

              <div className="bg-slate-900 border border-slate-700 rounded-xl p-4">
                <h4 className="font-bold text-white mb-3 text-sm">Performance Notes</h4>
                <div className="space-y-2">
                  {stats.triangles > 30000 && (
                    <div className="flex gap-2 text-xs text-amber-300">
                      <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                      High poly count ({stats.triangles.toLocaleString()} tris). Consider LOD generation.
                    </div>
                  )}
                  {stats.triangles <= 30000 && (
                    <div className="flex gap-2 text-xs text-emerald-300">
                      <CheckCircle2 className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                      Triangle count is within the FO4 static-prop budget.
                    </div>
                  )}
                </div>
              </div>
            </>
          ) : (
            <div className="bg-slate-900/40 border border-dashed border-slate-700 rounded-xl p-8 text-center">
              <Box className="w-10 h-10 text-slate-600 mx-auto mb-3" />
              <p className="text-sm text-slate-400 font-semibold">No mesh loaded</p>
              <p className="text-xs text-slate-600 mt-1 max-w-[220px] mx-auto">
                FO4 uses NIF, which browsers can't render directly. Click "Open .nif in NifSkope", export to glTF/GLB from its File menu, then "Load glTF/GLB" here.
              </p>
            </div>
          )}

          <div className="bg-slate-900 border border-slate-700 rounded-xl p-4">
            <h4 className="font-bold text-white mb-2 text-sm flex items-center gap-2">
              <Info className="w-4 h-4 text-slate-400" /> Why the extra step?
            </h4>
            <p className="text-xs text-slate-500 leading-relaxed">
              There's no NIF loader for the web — Gamebryo/NetImmerse is a proprietary
              binary format. NifSkope (the actively maintained community fork) can export
              FO4 meshes to glTF, which this viewer renders for real. A single .glb export
              is self-contained; plain .gltf may reference external .bin/texture files that
              a lone file pick can't resolve.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
