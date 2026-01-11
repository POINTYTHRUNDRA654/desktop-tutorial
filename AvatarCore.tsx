import React, { useEffect, useRef } from 'react';
import { useLive } from './LiveContext';

interface AvatarCoreProps {
    className?: string;
    showRings?: boolean; // Enable complex orbital rings (best for large views)
}

const AvatarCore: React.FC<AvatarCoreProps> = ({ className = "w-full h-full", showRings = false }) => {
    const { customAvatar, volume, mode, isActive } = useLive();
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const animationFrameRef = useRef<number>(0);

    // Calculate dynamic styles based on audio volume
    const audioLevel = Math.min(1, volume / 100);
    const pulseScale = 1 + audioLevel * (showRings ? 0.3 : 0.1); // Subtle pulse for small, big for large
    
    // Determine base colors
    let baseColor = 'text-emerald-500';
    let borderColor = 'border-emerald-500';
    let shadowColor = 'shadow-emerald-500/50';
    let hue = 150; // Emerald

    if (mode === 'listening') {
        baseColor = 'text-amber-500';
        borderColor = 'border-amber-500';
        shadowColor = 'shadow-amber-500/50';
        hue = 35;
    } else if (mode === 'processing') {
        baseColor = 'text-purple-500';
        borderColor = 'border-purple-500';
        shadowColor = 'shadow-purple-500/50';
        hue = 270;
    } else if (mode === 'speaking') {
        // Active speaking uses Emerald but brighter
        baseColor = 'text-emerald-400';
        hue = 150;
    }

    // --- PROCEDURAL ANIMATION (CANVAS) ---
    useEffect(() => {
        // If we have a custom avatar, we don't need the canvas loop
        if (customAvatar) {
            if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
            return;
        }

        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Configuration for rings
        const rings = showRings ? [
            { radius: 80, speed: 0.02, angle: 0, width: 4 },
            { radius: 120, speed: -0.015, angle: 1, width: 2 },
            { radius: 160, speed: 0.01, angle: 2, width: 1 },
        ] : [
            { radius: 40, speed: 0.05, angle: 0, width: 2 } // Single ring for mini view
        ];

        let time = 0;

        const render = () => {
            if (!canvas || !ctx) return;
            
            // Handle resizing
            const parent = canvas.parentElement;
            if (parent) {
                canvas.width = parent.clientWidth;
                canvas.height = parent.clientHeight;
            }

            const cx = canvas.width / 2;
            const cy = canvas.height / 2;
            const scale = Math.min(canvas.width, canvas.height) / (showRings ? 400 : 100); // Normalize size

            ctx.clearRect(0, 0, canvas.width, canvas.height);

            // Audio reactivity
            const currentPulse = 1 + audioLevel * 0.5;

            // --- DRAW BACKGROUND NETWORK ---
            if (showRings) {
                ctx.strokeStyle = `hsla(${hue}, 50%, 50%, 0.05)`;
                ctx.lineWidth = 1;
                ctx.beginPath();
                const nodeCount = 20;
                const radius = 300 * scale + audioLevel * 50;
                for (let i = 0; i < nodeCount; i++) {
                    const angle = (i / nodeCount) * Math.PI * 2 + time * 0.05;
                    const x = cx + Math.cos(angle) * radius;
                    const y = cy + Math.sin(angle) * radius;
                    ctx.moveTo(x, y);
                    ctx.lineTo(cx, cy);
                }
                ctx.stroke();
            }

            // --- DRAW RINGS ---
            rings.forEach((ring, i) => {
                ring.angle += ring.speed * (mode === 'processing' ? 4 : 1);
                
                const r = ring.radius * scale * currentPulse;
                
                ctx.beginPath();
                // Ellipse creates the 3D effect
                ctx.ellipse(cx, cy, r, r * 0.8, ring.angle, 0, Math.PI * 2);
                ctx.strokeStyle = `hsla(${hue}, 70%, 60%, ${0.2 - i * 0.05})`;
                ctx.lineWidth = ring.width * scale;
                ctx.stroke();
                
                // Satellite
                const satX = cx + Math.cos(ring.angle) * r * Math.cos(ring.angle) - Math.sin(ring.angle) * r * 0.8 * Math.sin(ring.angle);
                const satY = cy + Math.sin(ring.angle) * r * Math.cos(ring.angle) + Math.cos(ring.angle) * r * 0.8 * Math.sin(ring.angle);
                
                ctx.fillStyle = `hsla(${hue}, 100%, 80%, 0.8)`;
                ctx.beginPath();
                ctx.arc(satX, satY, 3 * scale, 0, Math.PI * 2);
                ctx.fill();
            });

            // --- DRAW CORE ---
            // Glow
            const coreSize = (showRings ? 50 : 20) * scale;
            const gradient = ctx.createRadialGradient(cx, cy, coreSize * 0.1, cx, cy, coreSize * 2 * currentPulse);
            gradient.addColorStop(0, `hsla(${hue}, 90%, 60%, 0.8)`);
            gradient.addColorStop(0.5, `hsla(${hue}, 80%, 40%, 0.2)`);
            gradient.addColorStop(1, `hsla(${hue}, 80%, 20%, 0)`);
            
            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.arc(cx, cy, coreSize * 2.5 * currentPulse, 0, Math.PI * 2);
            ctx.fill();

            // Solid Eye
            ctx.fillStyle = `hsla(${hue}, 100%, 95%, 1)`;
            ctx.beginPath();
            ctx.arc(cx, cy, coreSize * (0.2 + audioLevel * 0.2), 0, Math.PI * 2);
            ctx.fill();

            time += 0.01;
            animationFrameRef.current = requestAnimationFrame(render);
        };

        render();
        return () => cancelAnimationFrame(animationFrameRef.current);
    }, [mode, volume, customAvatar, showRings]);

    if (customAvatar) {
        return (
            <div className={`relative flex items-center justify-center ${className}`}>
                {/* Reactive Glow Ring */}
                <div 
                    className={`absolute inset-0 rounded-full border-2 opacity-50 transition-all duration-100 ${borderColor}`}
                    style={{ 
                        transform: `scale(${pulseScale})`,
                        boxShadow: isActive ? `0 0 ${volume + 10}px ${shadowColor.replace('shadow-', '')}` : 'none'
                    }}
                ></div>
                
                {/* The Image */}
                <img 
                    src={customAvatar} 
                    alt="Mossy" 
                    className={`w-full h-full rounded-full object-cover border-2 border-slate-900 shadow-2xl relative z-10 transition-transform duration-100 bg-black`}
                    style={{ 
                        transform: `scale(${1 + (volume/200) * 0.1})` 
                    }}
                />
            </div>
        );
    }

    return (
        <div className={`relative flex items-center justify-center ${className}`}>
             <canvas ref={canvasRef} className="w-full h-full absolute inset-0" />
        </div>
    );
};

export default AvatarCore;