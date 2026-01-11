import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenAI } from "@google/genai";
import { Aperture, Maximize, Crosshair, RefreshCcw, MessageSquare, Zap, AlertCircle, Check, Scan, Monitor, Target, MousePointer2, AlertTriangle } from 'lucide-react';

interface AnalysisResult {
    summary: string;
    pointsOfInterest: {
        x: number;
        y: number;
        label: string;
        type: 'error' | 'info' | 'action';
        pct?: number; // VATS percentage
    }[];
}

const TheLens: React.FC = () => {
    const [activeView, setActiveView] = useState<'desktop' | 'app' | 'webcam'>('desktop');
    const [currentImage, setCurrentImage] = useState<string | null>(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
    const [isVatsMode, setIsVatsMode] = useState(false);
    const [bridgeStatus, setBridgeStatus] = useState<'connected' | 'disconnected'>('disconnected');

    useEffect(() => {
        // Check initial bridge status
        const check = localStorage.getItem('mossy_bridge_active') === 'true';
        setBridgeStatus(check ? 'connected' : 'disconnected');
    }, []);

    const handleCapture = async () => {
        setIsAnalyzing(true);
        setAnalysis(null);
        setIsVatsMode(true); 
        
        try {
            // 1. TRY TO FETCH FROM REAL BRIDGE
            let imageBase64 = '';
            
            try {
                // Use 127.0.0.1 to avoid IPv6 issues
                const response = await fetch('http://127.0.0.1:21337/capture');
                if (!response.ok) throw new Error("Bridge refused connection");
                const data = await response.json();
                
                if (data.status === 'success' && data.image) {
                    setCurrentImage(data.image);
                    // Extract base64 without prefix for Gemini
                    imageBase64 = data.image.split(',')[1];
                    setBridgeStatus('connected');
                } else {
                    throw new Error("Invalid response from bridge");
                }
            } catch (err) {
                console.warn("Bridge capture failed, falling back to simulation.", err);
                setBridgeStatus('disconnected');
                // FALLBACK: Use placeholder if bridge is offline (User Experience preservation)
                setCurrentImage('https://placehold.co/1920x1080/1e1e1e/38bdf8?text=Bridge+Offline:+Simulation+Mode');
                
                // We can't really analyze a placeholder effectively, but we'll simulate it for the demo flow
                // In a real scenario, we'd stop here or alert the user.
            }

            if (!imageBase64 && bridgeStatus === 'connected') {
                 // If we thought we were connected but failed, stop
                 setIsAnalyzing(false);
                 return;
            }

            // 2. SEND TO GEMINI (Only if we have real data or forcing simulation)
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            
            // Build request
            const contents: any[] = [];
            
            if (imageBase64) {
                contents.push({
                    inlineData: {
                        mimeType: 'image/png',
                        data: imageBase64
                    }
                });
            }
            
            contents.push({
                text: `You are looking at the user's screen. Analyze the visual interface.
                Identify technical issues, code errors, or interesting UI elements.
                
                Return JSON:
                {
                    "summary": "Detailed description of what is on screen",
                    "pointsOfInterest": [
                        { "x": int (0-100), "y": int (0-100), "label": "Short label", "type": "error|info|action", "pct": int (0-100) }
                    ]
                }
                If image is a placeholder/black, allow hallucination for demo purposes but note it.`
            });

            // If we are in fallback mode (no base64), we just send text prompt which results in a simulated response based on the "placeholder" text usually
            // However, Gemini Vision requires an image or it acts as text model.
            // Let's just simulate the response if no real image to save API calls on junk data
            
            let result: AnalysisResult;

            if (imageBase64) {
                const response = await ai.models.generateContent({
                    model: 'gemini-3-pro-image-preview', // Vision model
                    contents: contents,
                    config: { responseMimeType: 'application/json' }
                });
                result = JSON.parse(response.text);
            } else {
                // Simulation Fallback
                await new Promise(r => setTimeout(r, 2000));
                result = {
                    summary: "Bridge Connection Unavailable. I cannot see your screen. Please run 'mossy_server.py' to enable visual uplinks. Displaying simulation data.",
                    pointsOfInterest: [
                        { x: 50, y: 50, label: "Connection Error", type: 'error', pct: 0 }
                    ]
                };
            }

            setAnalysis(result);

        } catch (e) {
            console.error("Analysis Failed", e);
            setAnalysis({
                summary: "Visual Cortex Error. The image could not be processed.",
                pointsOfInterest: []
            });
        } finally {
            setIsAnalyzing(false);
        }
    };

    return (
        <div className="h-full flex flex-col bg-forge-dark text-slate-200 font-sans">
            {/* Header */}
            <div className="p-4 border-b border-slate-700 bg-forge-panel flex justify-between items-center z-10 shadow-md">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-emerald-500/10 rounded-lg border border-emerald-500/20">
                        <Aperture className="w-6 h-6 text-emerald-400" />
                    </div>
                    <div>
                        <h2 className="text-lg font-bold text-white">The Lens</h2>
                        <p className="text-xs text-slate-400 font-mono">Visual Context Analysis & UI Overlay</p>
                    </div>
                </div>
                <div className="flex items-center gap-4">
                     <div className={`flex items-center gap-2 px-3 py-1.5 rounded text-xs font-bold border ${
                         bridgeStatus === 'connected' ? 'bg-emerald-900/20 border-emerald-500/50 text-emerald-400' : 'bg-red-900/20 border-red-500/50 text-red-400'
                     }`}>
                         {bridgeStatus === 'connected' ? <Check className="w-3 h-3"/> : <AlertTriangle className="w-3 h-3"/>}
                         {bridgeStatus === 'connected' ? 'EYES ONLINE' : 'BLIND (NO BRIDGE)'}
                     </div>
                     <div className="flex bg-slate-800 rounded-lg p-1 border border-slate-700">
                         <button 
                             onClick={() => setActiveView('desktop')}
                             className={`px-3 py-1.5 rounded text-xs font-bold flex items-center gap-2 transition-all ${activeView === 'desktop' ? 'bg-slate-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}
                         >
                             <Maximize className="w-4 h-4" /> Full Desktop
                         </button>
                     </div>
                </div>
            </div>

            <div className="flex-1 flex overflow-hidden">
                {/* Main Viewport */}
                <div className="flex-1 bg-black relative flex items-center justify-center overflow-hidden">
                    {/* Background Grid */}
                    <div 
                        className="absolute inset-0 opacity-20 pointer-events-none" 
                        style={{ backgroundImage: 'radial-gradient(#334155 1px, transparent 1px)', backgroundSize: '40px 40px' }}
                    />
                    
                    {/* VATS Overlay - Global Tint */}
                    {isVatsMode && currentImage && (
                        <div className="absolute inset-0 bg-[#16f342] opacity-10 mix-blend-overlay pointer-events-none z-20 animate-pulse-slow"></div>
                    )}
                    
                    {currentImage ? (
                        <div className="relative max-w-[90%] max-h-[90%] border border-slate-700 shadow-2xl rounded-lg overflow-hidden group">
                            <img 
                                src={currentImage} 
                                alt="Analysis Target" 
                                className={`w-full h-full object-contain block transition-all duration-1000 ${isVatsMode ? 'contrast-125 sepia brightness-110' : ''}`} 
                            />
                            
                            {/* Scanning Effect */}
                            {isAnalyzing && (
                                <div className="absolute inset-0 z-10 bg-emerald-500/5 overflow-hidden">
                                    <div className="w-full h-1 bg-emerald-500/50 shadow-[0_0_15px_#10b981] animate-scan-down"></div>
                                    <div className="absolute top-10 left-10 text-[#16f342] font-mono text-xl font-bold animate-blink">V.A.T.S. ENGAGED</div>
                                </div>
                            )}

                            {/* Overlays */}
                            {!isAnalyzing && analysis && analysis.pointsOfInterest.map((poi, i) => (
                                <div 
                                    key={i} 
                                    className="absolute animate-fade-in"
                                    style={{ left: `${poi.x}%`, top: `${poi.y}%` }}
                                >
                                    {/* VATS Box */}
                                    <div className="relative group/box cursor-pointer">
                                        <div className="absolute -top-12 -left-8 bg-[#000] border-2 border-[#16f342] text-[#16f342] px-2 py-1 font-mono text-sm font-bold shadow-[0_0_10px_#16f342]">
                                            {poi.pct}%
                                        </div>
                                        <div className={`w-16 h-16 border-2 border-[#16f342] -translate-x-1/2 -translate-y-1/2 bg-[#16f342]/10 hover:bg-[#16f342]/20 transition-colors`}>
                                            <div className="absolute top-0 left-0 w-2 h-2 border-t-2 border-l-2 border-[#16f342]"></div>
                                            <div className="absolute top-0 right-0 w-2 h-2 border-t-2 border-r-2 border-[#16f342]"></div>
                                            <div className="absolute bottom-0 left-0 w-2 h-2 border-b-2 border-l-2 border-[#16f342]"></div>
                                            <div className="absolute bottom-0 right-0 w-2 h-2 border-b-2 border-r-2 border-[#16f342]"></div>
                                        </div>
                                        
                                        {/* Label Box */}
                                        <div className={`absolute top-10 left-1/2 -translate-x-1/2 whitespace-nowrap px-3 py-1.5 bg-black/80 border border-[#16f342] text-[#16f342] text-xs font-bold shadow-xl backdrop-blur-md opacity-0 group-hover/box:opacity-100 transition-opacity z-30`}>
                                            <div className="flex items-center gap-2">
                                                {poi.type === 'error' ? <AlertCircle className="w-3 h-3" /> :
                                                 poi.type === 'action' ? <MousePointer2 className="w-3 h-3" /> :
                                                 <Check className="w-3 h-3" />}
                                                {poi.label}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-slate-600 flex flex-col items-center gap-4">
                             <Scan className="w-16 h-16 opacity-20" />
                             <p>Waiting for visual stream...</p>
                             {bridgeStatus === 'disconnected' && (
                                 <p className="text-xs text-red-400 bg-red-900/20 px-3 py-1 rounded border border-red-900/50">
                                     Bridge Offline. Please run 'mossy_server.py'.
                                 </p>
                             )}
                        </div>
                    )}
                </div>

                {/* Right Control Panel */}
                <div className="w-80 bg-slate-900 border-l border-slate-800 flex flex-col">
                    <div className="p-4 border-b border-slate-800">
                        <label className="text-xs font-bold text-slate-500 uppercase block mb-2">Operation Mode</label>
                        <div className="text-sm text-slate-300 bg-black/30 p-2 rounded mb-4">
                            {activeView === 'desktop' ? 'Full Desktop Capture' : 'Active Window Only'}
                        </div>
                        
                        <button 
                            onClick={handleCapture}
                            disabled={isAnalyzing}
                            className="w-full mt-2 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg flex items-center justify-center gap-2 transition-all shadow-lg shadow-emerald-900/20 disabled:opacity-50"
                        >
                            {isAnalyzing ? <RefreshCcw className="w-4 h-4 animate-spin" /> : <Crosshair className="w-4 h-4" />}
                            {isAnalyzing ? 'Scanning...' : 'Capture Vision'}
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto p-4">
                         <h3 className="text-xs font-bold text-slate-500 uppercase mb-3 flex items-center gap-2">
                             <Zap className="w-3 h-3" /> Intelligence Feed
                         </h3>
                         
                         {analysis ? (
                             <div className="space-y-4 animate-fade-in">
                                 <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-3 text-sm text-slate-300 leading-relaxed">
                                     <div className="flex items-start gap-2 mb-2">
                                         <MessageSquare className="w-4 h-4 text-emerald-400 mt-1 shrink-0" />
                                         <span className="font-bold text-emerald-400">Mossy:</span>
                                     </div>
                                     {analysis.summary}
                                 </div>

                                 <div className="space-y-2">
                                     {analysis.pointsOfInterest.map((poi, i) => (
                                         <div key={i} className={`p-3 rounded-lg border flex items-center gap-3 transition-colors cursor-pointer hover:bg-opacity-20 ${
                                             poi.type === 'error' ? 'bg-red-900/10 border-red-500/30 hover:bg-red-900' :
                                             poi.type === 'action' ? 'bg-emerald-900/10 border-emerald-500/30 hover:bg-emerald-900' :
                                             'bg-blue-900/10 border-blue-500/30 hover:bg-blue-900'
                                         }`}>
                                             <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                                                 poi.type === 'error' ? 'bg-red-500/20 text-red-400' :
                                                 poi.type === 'action' ? 'bg-emerald-500/20 text-emerald-400' :
                                                 'bg-blue-500/20 text-blue-400'
                                             }`}>
                                                 {i + 1}
                                             </div>
                                             <div>
                                                 <div className="text-xs font-bold text-slate-200">{poi.label}</div>
                                                 <div className="text-[10px] text-slate-500 uppercase">{poi.type} | {poi.pct}%</div>
                                             </div>
                                             <Target className="w-4 h-4 text-slate-600 ml-auto" />
                                         </div>
                                     ))}
                                 </div>
                             </div>
                         ) : (
                             <div className="text-center text-slate-600 text-xs mt-10">
                                 Capture a window to begin visual analysis.
                             </div>
                         )}
                    </div>
                    
                    <div className="p-3 border-t border-slate-800 bg-black/20 text-[10px] text-slate-500 text-center font-mono">
                         VISION MODEL: GEMINI-3-PRO
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TheLens;