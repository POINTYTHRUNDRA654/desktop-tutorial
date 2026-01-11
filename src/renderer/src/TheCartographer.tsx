import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenAI } from "@google/genai";
import { Map, Layout, Box, Target, Shield, Skull, Zap, Download, RefreshCw, ZoomIn, ZoomOut, Maximize, Navigation, Layers, Wind, Sun, Volume2, Thermometer, Radio } from 'lucide-react';

interface Room {
    id: string;
    name: string;
    x: number; // grid units
    y: number;
    w: number;
    h: number;
    type: 'corridor' | 'room' | 'hall' | 'start' | 'boss';
    description: string;
}

interface Entity {
    id: string;
    type: 'enemy' | 'loot' | 'npc' | 'trap';
    label: string;
    x: number; // relative grid coordinates
    y: number;
}

interface EnvironmentConfig {
    lighting: 'Dark' | 'Dim' | 'Bright' | 'Strobe' | 'Emergency';
    atmosphere: 'Clean' | 'Dusty' | 'Radioactive' | 'Foggy' | 'Void';
    audioTrack: 'Silence' | 'Industrial_Hum' | 'Combat_Music' | 'Eerie_Wind';
    gravity: number; // 1.0 is standard
    hazardLevel: number; // 0-10
}

interface LevelData {
    name: string;
    width: number;
    height: number;
    rooms: Room[];
    entities: Entity[];
    connections: { from: string, to: string }[];
    environment: EnvironmentConfig; // New Field
}

const TheCartographer: React.FC = () => {
    const [prompt, setPrompt] = useState('');
    const [levelData, setLevelData] = useState<LevelData | null>(null);
    const [isGenerating, setIsGenerating] = useState(false);
    const [zoom, setZoom] = useState(1);
    const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
    const [showPrevis, setShowPrevis] = useState(false);
    const [viewLayer, setViewLayer] = useState<'layout' | 'env'>('layout');
    
    // Canvas Refs
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    // Initial dummy data for visual test
    useEffect(() => {
        const saved = localStorage.getItem('mossy_scan_cartographer');
        if (saved) {
            setLevelData(JSON.parse(saved));
        } else if (!levelData) {
            setPrompt("A small underground bunker with a hidden lab.");
        }
    }, []);

    // Drawing Logic
    useEffect(() => {
        if (!levelData || !canvasRef.current) return;
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Reset
        const cellSize = 30 * zoom;
        canvas.width = (levelData.width + 4) * cellSize;
        canvas.height = (levelData.height + 4) * cellSize;
        
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.translate(2 * cellSize, 2 * cellSize); // Margin

        // Draw Environment Background if enabled
        if (viewLayer === 'env') {
            const hazardColor = levelData.environment.hazardLevel > 5 ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.05)';
            ctx.fillStyle = hazardColor;
            ctx.fillRect(0, 0, levelData.width * cellSize, levelData.height * cellSize);
        }

        // Draw Grid
        ctx.strokeStyle = '#1e293b';
        ctx.lineWidth = 1;
        for (let x = 0; x <= levelData.width; x++) {
            ctx.beginPath(); ctx.moveTo(x * cellSize, 0); ctx.lineTo(x * cellSize, levelData.height * cellSize); ctx.stroke();
        }
        for (let y = 0; y <= levelData.height; y++) {
            ctx.beginPath(); ctx.moveTo(0, y * cellSize); ctx.lineTo(levelData.width * cellSize, y * cellSize); ctx.stroke();
        }

        // Draw Connections (Corridors/Lines)
        ctx.strokeStyle = '#64748b';
        ctx.lineWidth = 4 * zoom;
        levelData.connections.forEach(conn => {
            const r1 = levelData.rooms.find(r => r.id === conn.from);
            const r2 = levelData.rooms.find(r => r.id === conn.to);
            if (r1 && r2) {
                const c1 = { x: (r1.x + r1.w/2) * cellSize, y: (r1.y + r1.h/2) * cellSize };
                const c2 = { x: (r2.x + r2.w/2) * cellSize, y: (r2.y + r2.h/2) * cellSize };
                ctx.beginPath();
                ctx.moveTo(c1.x, c1.y);
                ctx.lineTo(c2.x, c2.y);
                ctx.stroke();
            }
        });

        // Draw Rooms
        levelData.rooms.forEach(room => {
            const isSelected = selectedRoom?.id === room.id;
            
            // Fill
            if (viewLayer === 'env') {
                // Environment Mode Color coding
                ctx.fillStyle = '#0f172a'; // Base dark
                // Overlay fog/lighting visual
                if (levelData.environment.lighting === 'Dark') ctx.fillStyle = '#020617';
                if (levelData.environment.lighting === 'Emergency') ctx.fillStyle = '#450a0a';
            } else {
                // Standard Layout Mode
                ctx.fillStyle = room.type === 'start' ? '#059669' : 
                               room.type === 'boss' ? '#b91c1c' : 
                               room.type === 'corridor' ? '#334155' : '#0f172a';
            }
            
            if (isSelected) ctx.fillStyle = '#0ea5e9'; // Selection overrides

            ctx.fillRect(room.x * cellSize, room.y * cellSize, room.w * cellSize, room.h * cellSize);
            
            // Previs/Precombine Overlay (Simulated)
            if (showPrevis) {
                ctx.fillStyle = `rgba(255, 0, 255, 0.1)`; // Magenta typical debug color for precombs
                ctx.fillRect(room.x * cellSize, room.y * cellSize, room.w * cellSize, room.h * cellSize);
                ctx.strokeStyle = '#d946ef';
                ctx.lineWidth = 2;
                ctx.strokeRect(room.x * cellSize + 2, room.y * cellSize + 2, room.w * cellSize - 4, room.h * cellSize - 4);
            }

            // Border
            ctx.strokeStyle = isSelected ? '#fff' : '#94a3b8';
            ctx.lineWidth = isSelected ? 3 : 2;
            ctx.strokeRect(room.x * cellSize, room.y * cellSize, room.w * cellSize, room.h * cellSize);

            // Label
            ctx.fillStyle = '#fff';
            ctx.font = `${10 * zoom}px monospace`;
            ctx.textAlign = 'center';
            ctx.fillText(room.name, (room.x + room.w/2) * cellSize, (room.y + room.h/2) * cellSize);
        });

        // Draw Entities
        levelData.entities.forEach(ent => {
            const x = ent.x * cellSize;
            const y = ent.y * cellSize;
            const size = 6 * zoom;

            ctx.beginPath();
            if (ent.type === 'enemy') {
                ctx.fillStyle = '#ef4444';
                ctx.arc(x, y, size, 0, Math.PI * 2);
            } else if (ent.type === 'loot') {
                ctx.fillStyle = '#f59e0b';
                ctx.rect(x - size, y - size, size*2, size*2);
            } else if (ent.type === 'trap') {
                ctx.fillStyle = '#a855f7';
                ctx.moveTo(x, y - size); ctx.lineTo(x + size, y + size); ctx.lineTo(x - size, y + size);
            } else {
                ctx.fillStyle = '#3b82f6';
                ctx.arc(x, y, size, 0, Math.PI * 2);
            }
            ctx.fill();
        });

    }, [levelData, zoom, selectedRoom, showPrevis, viewLayer]);

    const handleCanvasClick = (e: React.MouseEvent) => {
        if (!levelData || !canvasRef.current) return;
        const rect = canvasRef.current.getBoundingClientRect();
        const scaleX = canvasRef.current.width / rect.width;
        const scaleY = canvasRef.current.height / rect.height;
        
        const clickX = (e.clientX - rect.left) * scaleX;
        const clickY = (e.clientY - rect.top) * scaleY;
        
        const cellSize = 30 * zoom;
        const margin = 2 * cellSize;

        // Find clicked room
        const clickedRoom = levelData.rooms.find(r => {
            const rx = (r.x * cellSize) + margin;
            const ry = (r.y * cellSize) + margin;
            const rw = r.w * cellSize;
            const rh = r.h * cellSize;
            return clickX >= rx && clickX <= rx + rw && clickY >= ry && clickY <= ry + rh;
        });

        setSelectedRoom(clickedRoom || null);
    };

    const handleGenerate = async () => {
        if (!prompt) return;
        setIsGenerating(true);
        setSelectedRoom(null);

        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            
            const systemPrompt = `
            You are a Level Design Architect AI. 
            Generate a 2D tile-based map layout based on the prompt: "${prompt}".
            The map should be a JSON object with:
            1. width, height (grid size, e.g. 20x20).
            2. rooms: array of { id, name, x, y, w, h, type: 'room'|'corridor'|'start'|'boss', description }.
               - Ensure rooms do NOT overlap.
               - Keep coordinates integer based.
            3. connections: array of { from: roomId, to: roomId } representing doorways.
            4. entities: array of { id, type: 'enemy'|'loot'|'trap', label, x, y } placed inside valid room bounds.
            5. environment: object { lighting: 'Dark'|'Dim'|'Bright'|'Strobe'|'Emergency', atmosphere: 'Clean'|'Dusty'|'Radioactive'|'Foggy'|'Void', audioTrack: string, gravity: float (default 1.0), hazardLevel: int (0-10) }.
            `;

            const response = await ai.models.generateContent({
                model: 'gemini-3-flash-preview',
                contents: systemPrompt,
                config: { responseMimeType: 'application/json' }
            });

            const data = JSON.parse(response.text);
            setLevelData(data);
            
            // BROADCAST TO SHARED MEMORY
            localStorage.setItem('mossy_scan_cartographer', JSON.stringify(data));
            window.dispatchEvent(new Event('mossy-memory-update'));

        } catch (e) {
            console.error(e);
            alert("Generation failed. Try simplifying the prompt.");
        } finally {
            setIsGenerating(false);
        }
    };

    const exportToJSON = () => {
        if (!levelData) return;
        const dataStr = JSON.stringify(levelData, null, 2);
        const blob = new Blob([dataStr], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `level_layout_${Date.now()}.json`;
        link.click();
    };

    return (
        <div className="h-full flex flex-col bg-[#0b121e] text-slate-200 font-sans relative overflow-hidden">
            {/* Header */}
            <div className="p-6 border-b border-slate-700 bg-slate-900 flex justify-between items-center z-10 shadow-md">
                <div>
                    <h2 className="text-xl font-bold text-white flex items-center gap-3">
                        <Map className="w-6 h-6 text-orange-400" />
                        The Cartographer
                    </h2>
                    <p className="text-xs text-slate-400 font-mono mt-1">Neural Level Design & Layout Engine</p>
                </div>
                
                <div className="flex items-center gap-4">
                    {/* View Layer Toggle */}
                    <div className="flex bg-slate-800 rounded-lg p-1 border border-slate-700">
                        <button 
                            onClick={() => setViewLayer('layout')} 
                            className={`px-3 py-1.5 rounded text-xs font-bold transition-all ${viewLayer === 'layout' ? 'bg-orange-600 text-white' : 'text-slate-400 hover:text-white'}`}
                        >
                            Layout
                        </button>
                        <button 
                            onClick={() => setViewLayer('env')} 
                            className={`px-3 py-1.5 rounded text-xs font-bold transition-all ${viewLayer === 'env' ? 'bg-teal-600 text-white' : 'text-slate-400 hover:text-white'}`}
                        >
                            Environment
                        </button>
                    </div>

                    {/* Previs Toggle */}
                    <button 
                        onClick={() => setShowPrevis(!showPrevis)}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-bold transition-all ${
                            showPrevis ? 'bg-fuchsia-900/30 border-fuchsia-500/50 text-fuchsia-300' : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'
                        }`}
                        title="Visualize Precombined Visibility Clusters"
                    >
                        <Layers className="w-3 h-3" /> {showPrevis ? 'Previs: ON' : 'Previs: OFF'}
                    </button>

                    <div className="flex gap-2 bg-slate-800 p-1 rounded-lg border border-slate-700">
                        <button onClick={() => setZoom(Math.max(0.5, zoom - 0.2))} className="p-2 hover:bg-slate-700 rounded text-slate-400 hover:text-white"><ZoomOut className="w-4 h-4" /></button>
                        <span className="flex items-center px-2 text-xs font-mono text-slate-500">{Math.round(zoom * 100)}%</span>
                        <button onClick={() => setZoom(Math.min(3, zoom + 0.2))} className="p-2 hover:bg-slate-700 rounded text-slate-400 hover:text-white"><ZoomIn className="w-4 h-4" /></button>
                    </div>
                </div>
            </div>

            <div className="flex-1 flex overflow-hidden">
                {/* Canvas Area */}
                <div 
                    ref={containerRef} 
                    className="flex-1 overflow-auto relative bg-[#080c14] flex items-center justify-center p-8"
                >
                    {levelData ? (
                        <canvas 
                            ref={canvasRef} 
                            onClick={handleCanvasClick}
                            className="shadow-2xl cursor-crosshair bg-[#0f172a] rounded border border-slate-800"
                        />
                    ) : (
                        <div className="flex flex-col items-center justify-center text-slate-600 opacity-50">
                            <Layout className="w-24 h-24 mb-6" />
                            <p className="text-lg">Waiting for coordinates...</p>
                        </div>
                    )}
                </div>

                {/* Right Controls */}
                <div className="w-80 bg-slate-900 border-l border-slate-800 flex flex-col z-20 shadow-2xl">
                    <div className="p-4 border-b border-slate-800 bg-slate-900">
                        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4">Design Parameters</h3>
                        <textarea 
                            value={prompt}
                            onChange={(e) => setPrompt(e.target.value)}
                            placeholder="Describe the level (e.g. 'A haunted mansion with a grand hall and a secret basement')..."
                            className="w-full h-24 bg-slate-800 border border-slate-700 rounded-lg p-3 text-sm text-white focus:outline-none focus:border-orange-500 resize-none mb-4"
                        />
                        <button 
                            onClick={handleGenerate}
                            disabled={!prompt || isGenerating}
                            className="w-full py-3 bg-orange-600 hover:bg-orange-500 text-white font-bold rounded-lg flex items-center justify-center gap-2 transition-all shadow-lg shadow-orange-900/20 disabled:opacity-50"
                        >
                            {isGenerating ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4 fill-current" />}
                            {isGenerating ? 'Architecting...' : 'Generate Layout'}
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto p-4">
                        {/* Environment Panel */}
                        {levelData && !selectedRoom && (
                            <div className="space-y-4 animate-fade-in">
                                <h3 className="text-xs font-bold text-teal-400 uppercase tracking-widest flex items-center gap-2 mb-2">
                                    <Radio className="w-3 h-3" /> Sector Environment
                                </h3>
                                
                                <div className="grid grid-cols-2 gap-2">
                                    <div className="bg-slate-800/50 p-3 rounded-lg border border-slate-700">
                                        <div className="text-[10px] text-slate-500 uppercase mb-1 flex items-center gap-1"><Sun className="w-3 h-3"/> Lighting</div>
                                        <div className="text-sm font-bold text-white">{levelData.environment.lighting}</div>
                                    </div>
                                    <div className="bg-slate-800/50 p-3 rounded-lg border border-slate-700">
                                        <div className="text-[10px] text-slate-500 uppercase mb-1 flex items-center gap-1"><Wind className="w-3 h-3"/> Atmos</div>
                                        <div className="text-sm font-bold text-white">{levelData.environment.atmosphere}</div>
                                    </div>
                                </div>

                                <div className="bg-slate-800/50 p-3 rounded-lg border border-slate-700">
                                    <div className="text-[10px] text-slate-500 uppercase mb-1 flex items-center gap-1"><Volume2 className="w-3 h-3"/> Audio Loop</div>
                                    <div className="text-sm font-mono text-emerald-400">{levelData.environment.audioTrack}.wav</div>
                                </div>

                                <div className="p-3 rounded-lg border border-slate-700 bg-black/20">
                                    <div className="flex justify-between items-center mb-2">
                                        <div className="text-[10px] text-slate-500 uppercase flex items-center gap-1"><Skull className="w-3 h-3"/> Hazard Level</div>
                                        <div className={`text-xs font-bold ${levelData.environment.hazardLevel > 5 ? 'text-red-500' : 'text-emerald-500'}`}>
                                            {levelData.environment.hazardLevel}/10
                                        </div>
                                    </div>
                                    <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                                        <div className={`h-full ${levelData.environment.hazardLevel > 5 ? 'bg-red-500' : 'bg-emerald-500'}`} style={{width: `${levelData.environment.hazardLevel * 10}%`}}></div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {selectedRoom ? (
                            <div className="space-y-4 animate-fade-in">
                                <div className="bg-slate-800 rounded-lg p-3 border border-slate-700">
                                    <div className="text-[10px] uppercase text-slate-500 font-bold mb-1">Selection</div>
                                    <h4 className="text-lg font-bold text-white">{selectedRoom.name}</h4>
                                    <div className="flex gap-2 mt-2">
                                        <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold ${
                                            selectedRoom.type === 'start' ? 'bg-emerald-900/50 text-emerald-400' :
                                            selectedRoom.type === 'boss' ? 'bg-red-900/50 text-red-400' :
                                            'bg-slate-700 text-slate-300'
                                        }`}>{selectedRoom.type}</span>
                                        <span className="px-2 py-0.5 rounded bg-slate-700 text-[10px] text-slate-300">
                                            {selectedRoom.w}x{selectedRoom.h} Grid
                                        </span>
                                    </div>
                                </div>
                                
                                <div className="text-sm text-slate-400 leading-relaxed border-l-2 border-orange-500/30 pl-3">
                                    {selectedRoom.description}
                                </div>

                                <div>
                                    <div className="text-xs font-bold text-slate-500 uppercase mb-2 flex items-center gap-2">
                                        <Box className="w-3 h-3" /> Contents
                                    </div>
                                    <div className="space-y-1">
                                        {levelData?.entities
                                            .filter(e => 
                                                e.x >= selectedRoom.x && e.x <= selectedRoom.x + selectedRoom.w &&
                                                e.y >= selectedRoom.y && e.y <= selectedRoom.y + selectedRoom.h
                                            )
                                            .map(ent => (
                                                <div key={ent.id} className="flex items-center gap-2 text-xs p-2 bg-slate-800/50 rounded">
                                                    {ent.type === 'enemy' ? <Skull className="w-3 h-3 text-red-400" /> : 
                                                     ent.type === 'loot' ? <Box className="w-3 h-3 text-amber-400" /> : 
                                                     ent.type === 'trap' ? <Shield className="w-3 h-3 text-purple-400" /> :
                                                     <Target className="w-3 h-3 text-blue-400" />}
                                                    <span className="text-slate-300">{ent.label}</span>
                                                </div>
                                            ))
                                        }
                                    </div>
                                </div>
                            </div>
                        ) : (
                            !levelData && (
                                <div className="flex flex-col items-center justify-center h-40 text-slate-600 gap-2">
                                    <Navigation className="w-8 h-8 opacity-20" />
                                    <span className="text-xs">No active map data.</span>
                                </div>
                            )
                        )}
                    </div>

                    <div className="p-4 border-t border-slate-800 grid grid-cols-2 gap-2">
                        <div className="col-span-2 text-[10px] text-slate-500 text-center mb-1 font-mono">
                            {levelData ? `${levelData.rooms.length} Rooms | ${levelData.entities.length} Entities` : 'No Data'}
                        </div>
                        <button 
                            onClick={exportToJSON}
                            disabled={!levelData}
                            className="flex items-center justify-center gap-2 p-2 bg-slate-800 hover:bg-slate-700 rounded text-xs font-bold transition-colors disabled:opacity-50 col-span-2"
                        >
                            <Download className="w-3 h-3" /> Export JSON
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TheCartographer;