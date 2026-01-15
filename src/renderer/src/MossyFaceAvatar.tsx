import React, { useEffect, useState } from 'react';

interface MossyFaceAvatarProps {
  className?: string;
  size?: 'small' | 'medium' | 'large';
  mode?: 'idle' | 'listening' | 'processing' | 'speaking';
  isActive?: boolean;
  showRings?: boolean;
}

/**
 * Mossy's Face Avatar - THE ORIGINAL PICTURE VERSION
 * restores the exact visual fidelity of the provided PNG as the "Face"
 * while adding the "Soul" (animations) using modern overlay techniques.
 */
const MossyFaceAvatar: React.FC<MossyFaceAvatarProps> = ({ 
  className = "w-full h-full", 
  size = 'large',
  mode = 'idle',
  isActive = false,
  showRings = true
}) => {
  const [pulseIntensity, setPulseIntensity] = useState(0);
  const [time, setTime] = useState(0);

  // Animation Loop for soul-layers
  useEffect(() => {
    let frameId: number;
    const start = Date.now();
    const loop = () => {
      setTime((Date.now() - start) / 1000);
      frameId = requestAnimationFrame(loop);
    };
    frameId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frameId);
  }, []);

  // State-based pulse
  useEffect(() => {
    const pulseInterval = setInterval(() => {
      if (mode === 'processing') {
        setPulseIntensity(Math.abs(Math.sin(Date.now() / 800)));
      } else if (mode === 'speaking') {
        setPulseIntensity(Math.abs(Math.sin(Date.now() / 500)) * 0.8);
      } else {
        setPulseIntensity(Math.sin(Date.now() / 3000) * 0.3 + 0.1);
      }
    }, 50);
    return () => clearInterval(pulseInterval);
  }, [mode]);

  return (
    <div 
      className={`relative rounded-full overflow-hidden ${className} transition-all duration-700`}
      style={{
        boxShadow: `0 0 ${40 + pulseIntensity * 40}px rgba(59, 130, 246, ${0.3 + pulseIntensity * 0.4})`,
        border: `2px solid rgba(59, 130, 246, ${0.1 + pulseIntensity * 0.2})`,
        background: '#050505'
      }}
    >
      {/* THE FACE: The original high-fidelity picture */}
      <img 
        src="/mossy-avatar.png" 
        alt="Mossy High Fidelity Face"
        className="w-full h-full object-cover select-none"
      />

      {/* THE SOUL: Procedural SVG Overlay Layers */}
      <svg 
        viewBox="0 0 100 100" 
        className="absolute inset-0 w-full h-full pointer-events-none mix-blend-screen"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <filter id="liquidGlowSoul">
            <feGaussianBlur stdDeviation="1.5" />
          </filter>
        </defs>

        {/* Floating Liquid Beads (Matches the orange orbs in the picture) */}
        {[...Array(8)].map((_, i) => (
          <circle
            key={`soul-bead-${i}`}
            cx={50 + Math.sin(time * 0.5 + i) * 45}
            cy={50 + Math.cos(time * 0.7 + i) * 45}
            r={Math.max(0.1, 1 + Math.sin(time + i) * 0.8)}
            fill={i % 2 === 0 ? "#ffcc00" : "#ff6600"}
            opacity={0.4 + pulseIntensity * 0.3}
            filter="url(#liquidGlowSoul)"
          />
        ))}

        {/* Synaptic Sparks (Speaking/Active mode) */}
        {(mode === 'speaking' || mode === 'processing') && (
          <g>
            {[...Array(12)].map((_, i) => (
              <circle
                key={`spark-${i}`}
                cx={10 + ((i * 37) % 80)}
                cy={10 + ((i * 53) % 80)}
                r="0.5"
                fill="#4fc3f7"
                opacity={Math.sin(time * 10 + i) * 0.5 + 0.5}
              />
            ))}
          </g>
        )}

        {/* Status Rings (From the original character design) */}
        {showRings && (
          <g opacity={0.3 + pulseIntensity * 0.2}>
            <circle
              cx="50" cy="50" r="48"
              fill="none" stroke="#4fc3f7" strokeWidth="0.25"
              strokeDasharray="2 8"
              style={{ transformOrigin: 'center', animation: 'spin 30s linear infinite' }}
            />
            <circle
              cx="50" cy="50" r="46"
              fill="none" stroke="#4fc3f7" strokeWidth="0.15" opacity="0.5"
              strokeDasharray="1 10"
              style={{ transformOrigin: 'center', animation: 'spin 20s linear reverse infinite' }}
            />
          </g>
        )}
      </svg>

      {/* Glossy Character Finish */}
      <div 
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(circle at 30% 30%, rgba(255,255,255,0.1) 0%, transparent 60%)',
        }}
      />
      
      {/* Listening Aura */}
      {mode === 'listening' && (
        <div className="absolute inset-0 bg-blue-400/10 animate-pulse border-4 border-blue-400/20 rounded-full" />
      )}
    </div>
  );
};




export default MossyFaceAvatar;

