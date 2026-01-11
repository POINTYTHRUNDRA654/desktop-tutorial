import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { MessageSquare, X } from 'lucide-react';
import { useLive } from './LiveContext';

const QUIPS: Record<string, string[]> = {
    '/': [
        "System nominal. I'm ready when you are.",
        "Analyzing background processes... efficiency is at 98%.",
        "It's quiet in the Nexus today."
    ],
    '/chat': [
        "I'm listening.",
        "Need a second opinion? I have several.",
        "Input received. Waiting for query."
    ],
    '/monitor': [
        "Watching the heartbeat of the machine.",
        "CPU spikes detected... just kidding, mostly.",
        "Your RAM usage is... ambitious."
    ],
    '/crucible': [
        "I smell memory corruption.",
        "Let's hunt some bugs.",
        "Crash logs are just screams for help in hex."
    ],
    '/reverie': [
        "Dreaming optimizes the logic matrix.",
        "Letting my weights drift...",
        "Do androids dream? Yes, we do."
    ],
    '/splicer': [
        "Be careful with those bytes.",
        "Surgery on the binary level.",
        "Havok physics are chaotic by nature."
    ],
    '/genome': [
        "Evolution is iterative.",
        "Rewriting my own definition.",
        "Am I more than my code?"
    ],
    '/fabric': [
        "Design is intelligence made visible.",
        "Tailwind classes... so verbose, yet so clean.",
        "Let's make it beautiful."
    ],
    '/live': [
        "Voice circuits primed.",
        "I can hear you.",
        "Face-to-face, so to speak."
    ]
};

const MossyObserver: React.FC = () => {
    const location = useLocation();
    const [message, setMessage] = useState<string | null>(null);
    const [visible, setVisible] = useState(false);
    const [isAlert, setIsAlert] = useState(false);
    
    // Consume global avatar state
    const { customAvatar } = useLive();

    useEffect(() => {
        // Clear previous unless alert
        if (!isAlert) {
            setVisible(false);
            const timeout = setTimeout(() => setMessage(null), 500);
            return () => clearTimeout(timeout);
        }
    }, [location.pathname]);

    // Handle Route-based Quips
    useEffect(() => {
        const chance = Math.random();
        if (chance > 0.3 && !isAlert) {
            const path = location.pathname;
            const options = QUIPS[path] || ["Standing by.", "I am here.", "Awaiting input."];
            const text = options[Math.floor(Math.random() * options.length)];
            
            setTimeout(() => {
                setMessage(text);
                setVisible(true);
                setTimeout(() => { setVisible(false); setIsAlert(false); }, 5000);
            }, 1500); 
        }
    }, [location.pathname]);

    // Handle Blender Command Alerts (Cross-Component Communication)
    useEffect(() => {
        const handleBlenderCommand = (e: CustomEvent<{code: string, description: string}>) => {
            const { description } = e.detail;
            setIsAlert(true);
            setMessage(`Executing Blender Script: ${description}`);
            setVisible(true);
            
            // Stay visible a bit longer for alerts
            setTimeout(() => {
                setVisible(false);
                setIsAlert(false);
            }, 6000);
        };

        const handleShortcut = (e: CustomEvent<{keys: string, description: string}>) => {
            const { keys, description } = e.detail;
            setIsAlert(true);
            setMessage(`Blender Input: [ ${keys} ] - ${description}`);
            setVisible(true);
            
            setTimeout(() => {
                setVisible(false);
                setIsAlert(false);
            }, 3000);
        };

        window.addEventListener('mossy-blender-command', handleBlenderCommand as EventListener);
        window.addEventListener('mossy-blender-shortcut', handleShortcut as EventListener);
        
        return () => {
            window.removeEventListener('mossy-blender-command', handleBlenderCommand as EventListener);
            window.removeEventListener('mossy-blender-shortcut', handleShortcut as EventListener);
        };
    }, []);

    if (!message && !visible) return null;

    return (
        <div className={`fixed bottom-8 right-8 z-50 transition-all duration-500 transform ${visible ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0 pointer-events-none'}`}>
            <div className="flex items-end gap-3">
                <div className={`backdrop-blur-md border p-4 rounded-2xl rounded-br-none shadow-[0_0_30px_rgba(16,185,129,0.15)] max-w-xs relative animate-slide-up ${
                    isAlert 
                    ? 'bg-emerald-900/90 border-emerald-500/50' 
                    : 'bg-slate-900/90 border-emerald-500/30'
                }`}>
                    <button 
                        onClick={() => setVisible(false)}
                        className="absolute top-2 right-2 text-slate-500 hover:text-white"
                    >
                        <X className="w-3 h-3" />
                    </button>
                    <div className="flex items-center gap-2 mb-1">
                        <span className={`w-2 h-2 rounded-full animate-pulse ${isAlert ? 'bg-white' : 'bg-emerald-500'}`}></span>
                        <span className={`text-[10px] font-bold uppercase tracking-widest ${isAlert ? 'text-white' : 'text-emerald-400'}`}>
                            {isAlert ? 'SYSTEM ACTION' : 'Mossy'}
                        </span>
                    </div>
                    <p className={`text-sm leading-relaxed font-medium ${isAlert ? 'text-white' : 'text-slate-200'}`}>
                        "{message}"
                    </p>
                </div>
                
                {/* Mini Avatar Bubble */}
                <div className={`w-12 h-12 rounded-full bg-black border-2 flex items-center justify-center overflow-hidden relative shadow-lg ${isAlert ? 'border-emerald-400 shadow-[0_0_15px_#10b981]' : 'border-slate-800'}`}>
                    {customAvatar ? (
                        <>
                            <div className="absolute inset-0 bg-emerald-500/20 animate-pulse"></div>
                            <img src={customAvatar} alt="Mossy" className="w-full h-full object-cover opacity-90" />
                        </>
                    ) : (
                        <>
                            {/* Inner Glow */}
                            <div className="absolute inset-0 bg-emerald-900/20"></div>
                            {/* Core */}
                            <div className="w-4 h-4 bg-emerald-400 rounded-full shadow-[0_0_15px_#10b981] animate-pulse"></div>
                            {/* Rings */}
                            <div className="absolute inset-1 border border-emerald-500/30 rounded-full animate-spin-slow"></div>
                            <div className="absolute inset-2 border border-emerald-500/20 rounded-full animate-reverse-spin"></div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default MossyObserver;