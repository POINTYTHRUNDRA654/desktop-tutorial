import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenAI } from "@google/genai";
import { Binary, Search, Eye, Cpu, Zap, FileCode, AlertTriangle, CheckCircle2, RefreshCw, Upload, Download, Scan, Boxes, Settings2, Activity, Network, Box, Cuboid } from 'lucide-react';

interface HavokNode {
    id: string;
    type: string; // hkpRigidBody, hkaSkeleton
    name: string;
    properties: { key: string; value: string }[];
    children?: string[]; // IDs
}

const TheSplicer: React.FC = () => {
    const [fileName, setFileName] = useState<string | null>(null);
    const [bytes, setBytes] = useState<Uint8Array | null>(null);
    const [cursor, setCursor] = useState<number | null>(null);
    const [viewMode, setViewMode] = useState<'hex' | 'havok' | 'render'>('hex');
    const [havokNodes, setHavokNodes] = useState<HavokNode[]>([]);
    
    // AI Analysis
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [analysisResult, setAnalysisResult] = useState<string | null>(null);
    const [structureMap, setStructureMap] = useState<{ start: number; end: number; label: string; color: string }[]>([]);

    const fileInputRef = useRef<HTMLInputElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);

    // Initial dummy data
    useEffect(() => {
        if (!bytes) {
            // Simulated generic header
            const str = "Havok Content Tools 2014.1.0";
            const dummy = new Uint8Array(256);
            for(let i=0; i<str.length; i++) dummy[i] = str.charCodeAt(i);
            for(let i=str.length; i<256; i++) dummy[i] = Math.floor(Math.random() * 256);
            
            setBytes(dummy);
            setFileName("skeleton_physics.hkx");
            // Auto-detect Havok mode for demo
            setViewMode('havok');
            setHavokNodes([
                { id: 'root', type: 'hkRootLevelContainer', name: 'Root', properties: [], children: ['phys', 'anim'] },
                { id: 'phys', type: 'hkpPhysicsData', name: 'Physics Data', properties: [], children: ['sys'] },
                { id: 'sys', type: 'hkpPhysicsSystem', name: 'System 01', properties: [], children: ['rb1', 'rb2', 'c1'] },
                { id: 'rb1', type: 'hkpRigidBody', name: 'Pelvis', properties: [{key: 'Mass', value: '15.0'}, {key: 'Friction', value: '0.5'}], children: [] },
                { id: 'rb2', type: 'hkpRigidBody', name: 'Thigh_L', properties: [{key: 'Mass', value: '8.0'}, {key: 'Friction', value: '0.5'}], children: [] },
                { id: 'c1', type: 'hkpConstraintInstance', name: 'Hip_Joint_L', properties: [{key: 'Type', value: 'BallAndSocket'}], children: [] },
                { id: 'anim', type: 'hkaAnimationContainer', name: 'Anim Data', properties: [], children: [] },
            ]);
        }
    }, []);

    // 3D Render Loop
    useEffect(() => {
        if (viewMode !== 'render' || !canvasRef.current) return;
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        let frameId: number;
        let rot = 0;

        const drawCube = (rotation: number) => {
            // Resize logic
            canvas.width = canvas.parentElement?.clientWidth || 400;
            canvas.height = canvas.parentElement?.clientHeight || 400;
            
            const cx = canvas.width / 2;
            const cy = canvas.height / 2;
            const size = 100;

            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = '#0f172a'; // Match bg
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            // NIF-like shape (Diamond)
            const vertices = [
                {x: 0, y: -1.5, z: 0}, 
                {x: 1, y: 0, z: 1}, {x: 1, y: 0, z: -1}, {x: -1, y: 0, z: -1}, {x: -1, y: 0, z: 1},
                {x: 0, y: 1.5, z: 0}
            ];

            const rotated = vertices.map(v => {
                let x = v.x * Math.cos(rotation) - v.z * Math.sin(rotation);
                let z = v.x * Math.sin(rotation) + v.z * Math.cos(rotation);
                
                let y = v.y * Math.cos(rotation * 0.5) - z * Math.sin(rotation * 0.5);
                z = v.y * Math.sin(rotation * 0.5) + z * Math.cos(rotation * 0.5);
                
                const scale = 300 / (300 + z * 50);
                return { x: cx + x * size * scale, y: cy + y * size * scale };
            });

            // Connect lines
            ctx.strokeStyle = '#38bdf8'; // Forge Accent
            ctx.lineWidth = 1.5;
            
            const lines = [
                [0,1], [0,2], [0,3], [0,4], // Top to mid
                [5,1], [5,2], [5,3], [5,4], // Bot to mid
                [1,2], [2,3], [3,4], [4,1]  // Mid ring
            ];

            ctx.beginPath();
            lines.forEach(([i1, i2]) => {
                ctx.moveTo(rotated[i1].x, rotated[i1].y);
                ctx.lineTo(rotated[i2].x, rotated[i2].y);
            });
            ctx.stroke();
            
            // Add Vertices
            ctx.fillStyle = '#fff';
            rotated.forEach(p => {
                ctx.beginPath();
                ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
                ctx.fill();
            });
        };

        const render = () => {
            rot += 0.01;
            drawCube(rot);
            frameId = requestAnimationFrame(render);
        };
        render();

        return () => cancelAnimationFrame(frameId);
    }, [viewMode]);

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        
        setFileName(file.name);
        const reader = new FileReader();
        reader.onload = (event) => {
            if (event.target?.result) {
                const buffer = event.target.result as ArrayBuffer;
                const uint8 = new Uint8Array(buffer).subarray(0, 1024);
                setBytes(uint8);
                
                // Simple heuristic for view mode
                if (file.name.endsWith('.hkx') || file.name.endsWith('.xml')) {
                    setViewMode('havok');
                } else if (file.name.endsWith('.nif')) {
                    setViewMode('render');
                } else {
                    setViewMode('hex');
                }
                
                setAnalysisResult(null);
                setStructureMap([]);
            }
        };
        reader.readAsArrayBuffer(file);
    };

    const handleOptimizeHavok = async () => {
        setIsAnalyzing(true);
        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            const prompt = `
                Act as Havok Physics Engine Expert.
                Analyze this physics setup:
                RigidBodies: Pelvis (Mass 15), Thigh_L (Mass 8).
                Constraints: Hip_Joint_L (BallAndSocket).
                
                Suggest optimizations for a Ragdoll in Fallout 4.
                Return a JSON object with:
                1. "suggestion": Technical advice.
                2. "optimizedProperties": Array of objects { id, key, value } with new values.
            `;
            
            const response = await ai.models.generateContent({
                model: 'gemini-3-flash-preview',
                contents: prompt,
                config: { responseMimeType: 'application/json' }
            });
            
            const result = JSON.parse(response.text);
            setAnalysisResult(result.suggestion);
            
            // Apply mock updates
            if (result.optimizedProperties) {
                const newNodes = [...havokNodes];
                // Simple update logic simulation
                setHavokNodes(newNodes);
            }
        } catch (e) {
            console.error(e);
            setAnalysisResult("Optimization failed.");
        } finally {
            setIsAnalyzing(false);
        }
    };

    const handleByteClick = (byteIndex: number) => {
        setCursor(byteIndex);
    };

    const getByteStyle = (index: number) => {
        const map = structureMap.find(m => index >= m.start && index < m.end);
        return map ? map.color : '';
    };

    const renderHavokTree = (nodes: HavokNode[], parentId: string | null = null, depth = 0) => {
        // Find nodes that are children of this parent (or root if null)
        // Our simple structure uses 'children' array IDs. 
        // We'll traverse based on the initial root 'root'.
        
        if (parentId === null) {
            const root = nodes.find(n => n.id === 'root');
            return root ? renderHavokTree(nodes, 'root', 0) : null;
        }

        const node = nodes.find(n => n.id === parentId);
        if (!node) return null;

        return (
            <div key={node.id} className="ml-4 border-l border-slate-700 pl-2">
                <div className="flex items-center gap-2 py-1 text-sm group cursor-pointer hover:text-white">
                    {node.type.includes('RigidBody') ? <Box className="w-4 h-4 text-orange-400" /> :
                     node.type.includes('Constraint') ? <Network className="w-4 h-4 text-blue-400" /> :
                     <Boxes className="w-4 h-4 text-slate-500" />}
                    
                    <span className="font-bold text-slate-300 group-hover:text-forge-accent">{node.name}</span>
                    <span className="text-[10px] text-slate-600 bg-black/30 px-1 rounded">{node.type}</span>
                </div>
                
                {/* Properties inline for leaf nodes */}
                {node.properties.length > 0 && (
                    <div className="ml-6 grid grid-cols-2 gap-x-4 gap-y-1 text-[10px] text-slate-500 mb-1">
                        {node.properties.map((p, i) => (
                            <div key={i} className="flex justify-between border-b border-slate-800">
                                <span>{p.key}</span>
                                <span className="text-emerald-500 font-mono">{p.value}</span>
                            </div>
                        ))}
                    </div>
                )}

                {node.children?.map(childId => renderHavokTree(nodes, childId, depth + 1))}
            </div>
        );
    };

    return (
        <div className="h-full flex flex-col bg-[#050505] text-slate-200 font-mono overflow-hidden relative">
            {/* Header */}
            <div className="p-4 border-b border-slate-800 bg-slate-900 flex justify-between items-center z-10 shadow-md">
                <div>
                    <h2 className="text-xl font-bold text-white flex items-center gap-3">
                        <Binary className="w-6 h-6 text-forge-accent" />
                        The Splicer
                    </h2>
                    <p className="text-xs text-slate-400 mt-1">Binary Surgeon & Havok Tools</p>
                </div>
                
                {/* View Toggles */}
                <div className="flex bg-slate-800 p-1 rounded-lg border border-slate-700">
                    <button 
                        onClick={() => setViewMode('hex')}
                        className={`px-4 py-1.5 rounded text-xs font-bold transition-all ${viewMode === 'hex' ? 'bg-slate-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}
                    >
                        Raw Hex
                    </button>
                    <button 
                        onClick={() => setViewMode('havok')}
                        className={`px-4 py-1.5 rounded text-xs font-bold transition-all flex items-center gap-2 ${viewMode === 'havok' ? 'bg-orange-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}
                    >
                        <Activity className="w-3 h-3" /> Physics
                    </button>
                    <button 
                        onClick={() => setViewMode('render')}
                        className={`px-4 py-1.5 rounded text-xs font-bold transition-all flex items-center gap-2 ${viewMode === 'render' ? 'bg-purple-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}
                    >
                        <Cuboid className="w-3 h-3" /> Holo-Render
                    </button>
                </div>

                <div className="flex gap-2">
                    <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileUpload} />
                    <button 
                        onClick={() => fileInputRef.current?.click()}
                        className="flex items-center gap-2 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-600 rounded text-xs font-bold transition-colors"
                    >
                        <Upload className="w-3 h-3" /> Load File
                    </button>
                    <button 
                        className="flex items-center gap-2 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-600 rounded text-xs font-bold transition-colors"
                    >
                        <Download className="w-3 h-3" /> Dump
                    </button>
                </div>
            </div>

            <div className="flex-1 flex overflow-hidden">
                {/* Main Content Area */}
                <div className="flex-1 bg-black overflow-y-auto p-4 relative custom-scrollbar">
                    {viewMode === 'hex' ? (
                        bytes ? (
                            <div className="grid grid-cols-[auto_1fr_auto] gap-x-6 text-sm font-mono leading-6">
                                {/* Offsets */}
                                <div className="text-slate-600 select-none text-right">
                                    {Array.from({ length: Math.ceil(bytes.length / 16) }).map((_, i) => (
                                        <div key={i}>{(i * 16).toString(16).padStart(8, '0').toUpperCase()}</div>
                                    ))}
                                </div>

                                {/* Hex Bytes */}
                                <div className="text-slate-300">
                                    {Array.from({ length: Math.ceil(bytes.length / 16) }).map((_, row) => (
                                        <div key={row} className="flex gap-2">
                                            {Array.from({ length: 16 }).map((_, col) => {
                                                const idx = row * 16 + col;
                                                if (idx >= bytes.length) return null;
                                                const byteVal = bytes[idx];
                                                const hex = byteVal.toString(16).padStart(2, '0').toUpperCase();
                                                const isActive = cursor === idx;
                                                const structStyle = getByteStyle(idx);

                                                return (
                                                    <span 
                                                        key={idx}
                                                        onClick={() => handleByteClick(idx)}
                                                        className={`cursor-pointer hover:bg-slate-700 px-0.5 rounded transition-colors ${isActive ? 'bg-forge-accent text-black font-bold' : structStyle}`}
                                                    >
                                                        {hex}
                                                    </span>
                                                );
                                            })}
                                        </div>
                                    ))}
                                </div>

                                {/* ASCII Decode */}
                                <div className="text-slate-500 border-l border-slate-800 pl-4">
                                    {Array.from({ length: Math.ceil(bytes.length / 16) }).map((_, row) => (
                                        <div key={row} className="whitespace-pre">
                                            {Array.from({ length: 16 }).map((_, col) => {
                                                const idx = row * 16 + col;
                                                if (idx >= bytes.length) return null;
                                                const byteVal = bytes[idx];
                                                const char = byteVal >= 32 && byteVal <= 126 ? String.fromCharCode(byteVal) : '.';
                                                const isActive = cursor === idx;
                                                return (
                                                    <span key={idx} className={`${isActive ? 'text-forge-accent font-bold' : ''}`}>
                                                        {char}
                                                    </span>
                                                );
                                            }).join('')}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center h-full text-slate-600">
                                <FileCode className="w-16 h-16 mb-4 opacity-20" />
                                <p>No file loaded.</p>
                            </div>
                        )
                    ) : viewMode === 'render' ? (
                        <div className="h-full flex flex-col relative">
                            <div className="absolute top-2 left-2 z-10 bg-black/50 p-2 rounded text-xs text-slate-400">
                                Render Mode: Wireframe
                            </div>
                            <canvas ref={canvasRef} className="w-full h-full bg-[#0f172a] rounded-lg shadow-inner" />
                        </div>
                    ) : (
                        // Havok Structure View
                        <div className="h-full flex flex-col">
                            <div className="flex items-center gap-2 mb-4 p-2 bg-orange-900/10 border border-orange-500/20 rounded text-orange-200 text-xs">
                                <Activity className="w-4 h-4" />
                                <span>Havok Content Tools 2014.1 Interop Layer Active</span>
                            </div>
                            <div className="flex-1 overflow-auto">
                                {renderHavokTree(havokNodes)}
                            </div>
                        </div>
                    )}
                </div>

                {/* Right: Inspector Panel */}
                <div className="w-80 bg-slate-900 border-l border-slate-800 flex flex-col">
                    <div className="p-4 border-b border-slate-800 bg-slate-900/50">
                        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                            <Search className="w-3 h-3" /> {viewMode === 'hex' ? 'Data Inspector' : viewMode === 'render' ? 'Mesh Stats' : 'Physics Properties'}
                        </h3>
                    </div>

                    <div className="p-4 flex-1 overflow-y-auto">
                        {viewMode === 'hex' && cursor !== null && bytes ? (
                            <div className="space-y-6">
                                <div className="space-y-1">
                                    <div className="text-xs text-slate-500">Offset</div>
                                    <div className="text-xl font-bold text-white">0x{cursor.toString(16).toUpperCase()}</div>
                                    <div className="text-xs text-slate-500">Decimal: {cursor}</div>
                                </div>

                                <div className="space-y-2">
                                    <div className="flex justify-between text-xs border-b border-slate-800 pb-1">
                                        <span className="text-slate-400">Int8</span>
                                        <span className="text-emerald-400">{bytes[cursor]}</span>
                                    </div>
                                    <div className="flex justify-between text-xs border-b border-slate-800 pb-1">
                                        <span className="text-slate-400">UInt8</span>
                                        <span className="text-emerald-400">{bytes[cursor]}</span>
                                    </div>
                                    <div className="flex justify-between text-xs border-b border-slate-800 pb-1">
                                        <span className="text-slate-400">Char</span>
                                        <span className="text-emerald-400">'{String.fromCharCode(bytes[cursor])}'</span>
                                    </div>
                                </div>
                            </div>
                        ) : viewMode === 'render' ? (
                            <div className="space-y-4 text-xs">
                                <div>
                                    <div className="text-slate-500 uppercase font-bold mb-1">Geometry</div>
                                    <div className="bg-slate-800 p-2 rounded">
                                        <div className="flex justify-between"><span>Vertices</span><span className="text-white">6</span></div>
                                        <div className="flex justify-between"><span>Triangles</span><span className="text-white">8</span></div>
                                        <div className="flex justify-between"><span>Strips</span><span className="text-white">0</span></div>
                                    </div>
                                </div>
                                <div>
                                    <div className="text-slate-500 uppercase font-bold mb-1">Material</div>
                                    <div className="bg-slate-800 p-2 rounded">
                                        <div>Shader: <span className="text-purple-400">PBR_MetalRough</span></div>
                                        <div>Flags: <span className="text-emerald-400">TwoSided, CastShadow</span></div>
                                    </div>
                                </div>
                            </div>
                        ) : viewMode === 'havok' ? (
                            <div className="space-y-6">
                                <div className="bg-slate-800 p-3 rounded-lg border border-slate-700">
                                    <div className="text-xs font-bold text-slate-400 mb-2">Simulation Stats</div>
                                    <div className="space-y-1 text-[10px]">
                                        <div className="flex justify-between"><span>Bodies</span><span className="text-white">2</span></div>
                                        <div className="flex justify-between"><span>Constraints</span><span className="text-white">1</span></div>
                                        <div className="flex justify-between"><span>Version</span><span className="text-orange-400">hk_2014</span></div>
                                    </div>
                                </div>

                                <div className="pt-4 border-t border-slate-800">
                                    <button 
                                        onClick={handleOptimizeHavok}
                                        disabled={isAnalyzing}
                                        className="w-full py-2 bg-orange-600 hover:bg-orange-500 text-white font-bold rounded flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
                                    >
                                        {isAnalyzing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Settings2 className="w-4 h-4" />}
                                        {isAnalyzing ? 'Calculating...' : 'Optimize Inertia'}
                                    </button>
                                    
                                    {analysisResult && (
                                        <div className="mt-4 bg-slate-800 border border-slate-700 rounded p-3 text-xs text-slate-300 leading-relaxed animate-fade-in">
                                            <div className="flex items-center gap-2 mb-1 text-orange-400 font-bold">
                                                <Eye className="w-3 h-3" /> Report
                                            </div>
                                            {analysisResult}
                                        </div>
                                    )}
                                </div>
                            </div>
                        ) : (
                            <div className="text-center text-slate-600 text-xs mt-10">
                                Select data to inspect.
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TheSplicer;