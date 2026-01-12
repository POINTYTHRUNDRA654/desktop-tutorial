import React, { useEffect, useState } from 'react';

interface MossyFaceAvatarProps {
  className?: string;
  size?: 'small' | 'medium' | 'large';
  mode?: 'idle' | 'listening' | 'processing' | 'speaking';
  isActive?: boolean;
}

/**
 * Mossy's Face Avatar - Stylized 3D rendered face with LIVE animations
 * Based on the original Mossy Desktop AI avatar design
 * Features: Blue-white skin, expressive eyes, flowing red/orange hair with golden spheres
 * NOW WITH: Blinking, eye contact, expressions, and real-time mode-based reactions!
 */
const MossyFaceAvatar: React.FC<MossyFaceAvatarProps> = ({ 
  className = "w-full h-full", 
  size = 'large',
  mode = 'idle',
  isActive = false
}) => {
  const [isBlinking, setIsBlinking] = useState(false);
  const [eyeContact, setEyeContact] = useState(0);
  const [mouthOpen, setMouthOpen] = useState(0);
  const [pulseIntensity, setPulseIntensity] = useState(0);

  // Blink animation
  useEffect(() => {
    const blinkInterval = setInterval(() => {
      setIsBlinking(true);
      setTimeout(() => setIsBlinking(false), 150);
    }, 4000 + Math.random() * 3000);

    return () => clearInterval(blinkInterval);
  }, []);

  // Eye contact movement
  useEffect(() => {
    if (mode === 'speaking') {
      const moveInterval = setInterval(() => {
        setEyeContact(Math.sin(Date.now() / 2000) * 0.3);
      }, 100);
      return () => clearInterval(moveInterval);
    } else if (mode === 'listening') {
      setEyeContact(0.2);
    } else {
      const moveInterval = setInterval(() => {
        setEyeContact(Math.sin(Date.now() / 4000) * 0.15);
      }, 100);
      return () => clearInterval(moveInterval);
    }
  }, [mode]);

  // Mouth animation
  useEffect(() => {
    if (mode === 'speaking') {
      const mouthInterval = setInterval(() => {
        setMouthOpen(Math.abs(Math.sin(Date.now() / 300)) * 0.8);
      }, 50);
      return () => clearInterval(mouthInterval);
    } else {
      setMouthOpen(0);
    }
  }, [mode]);

  // Pulse animation
  useEffect(() => {
    const pulseInterval = setInterval(() => {
      if (mode === 'processing') {
        setPulseIntensity(Math.abs(Math.sin(Date.now() / 800)));
      } else if (mode === 'speaking') {
        setPulseIntensity(Math.abs(Math.sin(Date.now() / 500)) * 0.8);
      } else if (mode === 'listening') {
        setPulseIntensity(0.6);
      } else {
        setPulseIntensity(Math.sin(Date.now() / 3000) * 0.4 + 0.1);
      }
    }, 50);
    return () => clearInterval(pulseInterval);
  }, [mode]);

  const viewBoxSize = 200;
  const time = Date.now();

  return (
    <svg 
      viewBox={`0 0 ${viewBoxSize} ${viewBoxSize}`} 
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      style={{
        filter: `drop-shadow(0 0 ${20 + pulseIntensity * 15}px rgba(100, 200, 255, ${0.4 + pulseIntensity * 0.3}))`,
        background: `radial-gradient(ellipse at center, rgba(100,200,255,${0.05 + pulseIntensity * 0.1}) 0%, transparent 70%)`,
      }}
    >
      <defs>
        <radialGradient id="mossySkinGradient" cx="50%" cy="45%">
          <stop offset="0%" stopColor="#e8f4f8" />
          <stop offset="50%" stopColor="#b3d9e8" />
          <stop offset="100%" stopColor="#8bc3d9" />
        </radialGradient>
        
        <radialGradient id="mossyHairGradient" cx="40%" cy="30%">
          <stop offset="0%" stopColor="#ff6b4a" />
          <stop offset="50%" stopColor="#ff4444" />
          <stop offset="100%" stopColor="#cc2200" />
        </radialGradient>

        <filter id="mossyGlow">
          <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
          <feMerge>
            <feMergeNode in="coloredBlur"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>

        <filter id="sphereShine">
          <feGaussianBlur in="SourceGraphic" stdDeviation="1" />
        </filter>

        <filter id="activeGlow">
          <feGaussianBlur stdDeviation={2 + pulseIntensity * 3} />
        </filter>
      </defs>

      {/* Animated outer aura */}
      <circle
        cx={viewBoxSize / 2}
        cy={viewBoxSize / 2}
        r={88 + pulseIntensity * 5}
        fill="none"
        stroke="#4ac4ff"
        strokeWidth={0.5 + pulseIntensity * 1}
        opacity={0.2 + pulseIntensity * 0.3}
        style={{transition: 'all 0.1s ease'}}
      />

      {/* Hair - Left side */}
      <path
        d="M 40 60 Q 30 80 35 120 Q 40 150 60 160 Q 50 140 55 100 Q 45 80 40 60"
        fill="url(#mossyHairGradient)"
        opacity="0.9"
      />

      {/* Hair - Right side */}
      <path
        d="M 160 60 Q 170 80 165 120 Q 160 150 140 160 Q 150 140 145 100 Q 155 80 160 60"
        fill="url(#mossyHairGradient)"
        opacity="0.9"
      />

      {/* Hair - Top */}
      <path
        d="M 70 40 Q 100 25 130 40 Q 120 50 100 55 Q 85 52 70 40"
        fill="url(#mossyHairGradient)"
        opacity="0.85"
      />

      {/* Face */}
      <ellipse
        cx={viewBoxSize / 2}
        cy={viewBoxSize / 2 - 5}
        rx="55"
        ry="60"
        fill="url(#mossySkinGradient)"
        stroke="#7a9fb5"
        strokeWidth="0.5"
        filter="url(#mossyGlow)"
      />

      {/* Cheek highlights */}
      <ellipse
        cx="70"
        cy="110"
        rx="18"
        ry="14"
        fill="#c5e3f0"
        opacity={0.4 + pulseIntensity * 0.2}
        style={{transition: 'opacity 0.1s ease'}}
      />

      <ellipse
        cx="130"
        cy="110"
        rx="18"
        ry="14"
        fill="#c5e3f0"
        opacity={0.4 + pulseIntensity * 0.2}
        style={{transition: 'opacity 0.1s ease'}}
      />

      {/* Eyes - Left */}
      <g>
        <ellipse 
          cx="80" 
          cy={85 + (isBlinking ? 8 : 0)} 
          rx="12" 
          ry={isBlinking ? 2 : 14} 
          fill="#ffffff" 
          stroke="#a0c5d9" 
          strokeWidth="0.5"
          style={{transition: 'cy 0.1s, ry 0.1s'}}
        />
        
        {!isBlinking && (
          <>
            <circle 
              cx={82 + eyeContact * 3} 
              cy={87 + Math.sin(time / 5000) * 1} 
              r="8" 
              fill="#4a90e2" 
              style={{transition: 'cx 0.1s ease'}}
            />
            <circle 
              cx={83 + eyeContact * 3} 
              cy={86 + Math.sin(time / 5000) * 1} 
              r="5" 
              fill="#0a2540"
              style={{transition: 'cx 0.1s ease'}}
            />
            <circle 
              cx={84 + eyeContact * 2} 
              cy={84 + Math.sin(time / 5000) * 0.5} 
              r={2.5 + pulseIntensity * 0.5} 
              fill="#ffffff" 
              opacity={0.8 + pulseIntensity * 0.2}
              style={{transition: 'r 0.1s'}}
            />
            <path d="M 68 75 Q 75 70 92 75" stroke="#4a4a4a" strokeWidth="1" fill="none" />
            <path d="M 68 99 Q 75 104 92 99" stroke="#4a4a4a" strokeWidth="1" fill="none" opacity="0.6" />
          </>
        )}
      </g>

      {/* Eyes - Right */}
      <g>
        <ellipse 
          cx="120" 
          cy={85 + (isBlinking ? 8 : 0)} 
          rx="12" 
          ry={isBlinking ? 2 : 14} 
          fill="#ffffff" 
          stroke="#a0c5d9" 
          strokeWidth="0.5"
          style={{transition: 'cy 0.1s, ry 0.1s'}}
        />
        
        {!isBlinking && (
          <>
            <circle 
              cx={118 + eyeContact * 3} 
              cy={87 + Math.sin(time / 5000) * 1} 
              r="8" 
              fill="#4a90e2"
              style={{transition: 'cx 0.1s ease'}}
            />
            <circle 
              cx={117 + eyeContact * 3} 
              cy={86 + Math.sin(time / 5000) * 1} 
              r="5" 
              fill="#0a2540"
              style={{transition: 'cx 0.1s ease'}}
            />
            <circle 
              cx={116 + eyeContact * 2} 
              cy={84 + Math.sin(time / 5000) * 0.5} 
              r={2.5 + pulseIntensity * 0.5} 
              fill="#ffffff" 
              opacity={0.8 + pulseIntensity * 0.2}
              style={{transition: 'r 0.1s'}}
            />
            <path d="M 134 75 Q 125 70 108 75" stroke="#4a4a4a" strokeWidth="1" fill="none" />
            <path d="M 134 99 Q 125 104 108 99" stroke="#4a4a4a" strokeWidth="1" fill="none" opacity="0.6" />
          </>
        )}
      </g>

      {/* Eyebrows */}
      <g opacity={0.7}>
        <path 
          d={mode === 'processing' ? "M 65 70 Q 80 65 95 70" : "M 65 72 Q 80 68 95 72"}
          stroke="#4a4a4a" 
          strokeWidth="1.5" 
          fill="none"
          style={{transition: 'd 0.3s'}}
        />
        <path 
          d={mode === 'processing' ? "M 135 70 Q 120 65 105 70" : "M 135 72 Q 120 68 105 72"}
          stroke="#4a4a4a" 
          strokeWidth="1.5" 
          fill="none"
          style={{transition: 'd 0.3s'}}
        />
      </g>

      {/* Nose */}
      <path
        d="M 100 75 L 98 105 Q 100 108 102 105 L 100 75"
        fill="#a3c5d9"
        opacity="0.4"
      />

      {/* Mouth */}
      <g>
        <path
          d={mouthOpen > 0.2 ? `M 85 125 Q 100 ${135 + mouthOpen * 5} 115 125` : "M 85 125 Q 100 135 115 125"}
          stroke="#d9a5a5"
          strokeWidth="2.5"
          fill="none"
          strokeLinecap="round"
          style={{transition: 'd 0.05s'}}
        />
        <path
          d={mouthOpen > 0.2 ? `M 85 125 Q 100 ${142 - mouthOpen * 8} 115 125` : "M 85 125 Q 100 142 115 125"}
          stroke="#c08080"
          strokeWidth="2"
          fill="none"
          strokeLinecap="round"
          style={{transition: 'd 0.05s'}}
        />
        {mouthOpen > 0.3 && (
          <ellipse 
            cx="100" 
            cy={130 + mouthOpen * 3} 
            rx="12" 
            ry={6 + mouthOpen * 4} 
            fill="#e8b5b5" 
            opacity={0.4 + mouthOpen * 0.3}
            style={{transition: 'all 0.05s'}}
          />
        )}
      </g>

      {/* Forehead highlight */}
      <ellipse 
        cx="100" 
        cy="60" 
        rx="35" 
        ry="12" 
        fill="#ffffff" 
        opacity={0.1 + pulseIntensity * 0.15}
        style={{transition: 'opacity 0.1s ease'}}
      />

      {/* Golden spheres with animation */}
      {/* Top left */}
      <g style={{
        transform: `translate(${Math.sin(time / 2000) * 3}px, ${Math.cos(time / 2500) * 2}px)`,
        transformOrigin: '50px 45px',
        transition: 'transform 0.05s ease'
      }}>
        <circle cx="50" cy="45" r={8 + pulseIntensity * 2} fill="#ffa500" opacity={0.8 + pulseIntensity * 0.2} filter="url(#sphereShine)" />
        <circle cx="50" cy="45" r="6.5" fill="#ffb84d" opacity={0.6 + pulseIntensity * 0.2} />
        <circle cx="48" cy="43" r={2.5 + pulseIntensity * 1} fill="#ffffff" opacity={0.7 + pulseIntensity * 0.2} />
      </g>

      {/* Top center */}
      <g style={{
        transform: `translateY(${Math.cos(time / 2000) * 4}px)`,
        transformOrigin: '100px 25px',
        transition: 'transform 0.05s ease'
      }}>
        <circle cx="100" cy="25" r={10 + pulseIntensity * 2} fill="#ffa500" opacity={0.8 + pulseIntensity * 0.2} filter="url(#sphereShine)" />
        <circle cx="100" cy="25" r="8" fill="#ffb84d" opacity={0.6 + pulseIntensity * 0.2} />
        <circle cx="98" cy="22" r={3 + pulseIntensity * 1} fill="#ffffff" opacity={0.7 + pulseIntensity * 0.2} />
      </g>

      {/* Top right */}
      <g style={{
        transform: `translate(${Math.sin(time / 2000) * -3}px, ${Math.cos(time / 2500) * 2}px)`,
        transformOrigin: '150px 45px',
        transition: 'transform 0.05s ease'
      }}>
        <circle cx="150" cy="45" r={8 + pulseIntensity * 2} fill="#ffa500" opacity={0.8 + pulseIntensity * 0.2} filter="url(#sphereShine)" />
        <circle cx="150" cy="45" r="6.5" fill="#ffb84d" opacity={0.6 + pulseIntensity * 0.2} />
        <circle cx="152" cy="43" r={2.5 + pulseIntensity * 1} fill="#ffffff" opacity={0.7 + pulseIntensity * 0.2} />
      </g>

      {/* Other spheres */}
      <g style={{opacity: 0.75 + pulseIntensity * 0.15, transition: 'opacity 0.1s ease'}}>
        <circle cx="35" cy="95" r={7 + pulseIntensity * 1.5} fill="#ff8c00" />
        <circle cx="35" cy="95" r="5.5" fill="#ffb84d" opacity="0.5" />
        <circle cx="33" cy="93" r={2 + pulseIntensity * 0.5} fill="#ffffff" opacity="0.6" />
      </g>

      <g style={{opacity: 0.75 + pulseIntensity * 0.15, transition: 'opacity 0.1s ease'}}>
        <circle cx="165" cy="95" r={7 + pulseIntensity * 1.5} fill="#ff8c00" />
        <circle cx="165" cy="95" r="5.5" fill="#ffb84d" opacity="0.5" />
        <circle cx="167" cy="93" r={2 + pulseIntensity * 0.5} fill="#ffffff" opacity="0.6" />
      </g>

      <g style={{opacity: 0.7 + pulseIntensity * 0.15, transition: 'opacity 0.1s ease'}}>
        <circle cx="55" cy="140" r={6.5 + pulseIntensity * 1} fill="#ff9500" />
        <circle cx="55" cy="140" r="5" fill="#ffb84d" opacity="0.5" />
        <circle cx="54" cy="138" r={1.8 + pulseIntensity * 0.5} fill="#ffffff" opacity="0.6" />
      </g>

      <g style={{opacity: 0.7 + pulseIntensity * 0.15, transition: 'opacity 0.1s ease'}}>
        <circle cx="145" cy="140" r={6.5 + pulseIntensity * 1} fill="#ff9500" />
        <circle cx="145" cy="140" r="5" fill="#ffb84d" opacity="0.5" />
        <circle cx="146" cy="138" r={1.8 + pulseIntensity * 0.5} fill="#ffffff" opacity="0.6" />
      </g>

      {/* Liquid flows */}
      <path
        d="M 60 55 Q 55 70 60 90"
        stroke="#ff6b4a"
        strokeWidth={1.5 + pulseIntensity * 1}
        fill="none"
        opacity={0.3 + pulseIntensity * 0.2}
        style={{transition: 'stroke-width 0.1s, opacity 0.1s'}}
      />
      <path
        d="M 140 55 Q 145 70 140 90"
        stroke="#ff6b4a"
        strokeWidth={1.5 + pulseIntensity * 1}
        fill="none"
        opacity={0.3 + pulseIntensity * 0.2}
        style={{transition: 'stroke-width 0.1s, opacity 0.1s'}}
      />

      {/* Mode-based glows */}
      {mode === 'listening' && (
        <circle
          cx={viewBoxSize / 2}
          cy={viewBoxSize / 2}
          r="85"
          fill="none"
          stroke="#ffa500"
          strokeWidth="1"
          opacity={0.6 * pulseIntensity}
        />
      )}

      {mode === 'speaking' && (
        <circle
          cx={viewBoxSize / 2}
          cy={viewBoxSize / 2}
          r="85"
          fill="none"
          stroke="#4ac4ff"
          strokeWidth={1 + pulseIntensity}
          opacity={0.8}
        />
      )}

      {mode === 'processing' && (
        <g opacity={pulseIntensity}>
          <circle cx={viewBoxSize / 2} cy={viewBoxSize / 2} r="78" fill="none" stroke="#b084cc" strokeWidth="0.5" />
          <circle cx={viewBoxSize / 2} cy={viewBoxSize / 2} r="82" fill="none" stroke="#b084cc" strokeWidth="0.5" opacity="0.5" />
        </g>
      )}

      {/* Standard aura */}
      <circle
        cx={viewBoxSize / 2}
        cy={viewBoxSize / 2}
        r="85"
        fill="none"
        stroke="#4ac4ff"
        strokeWidth={0.5 + pulseIntensity * 0.5}
        opacity={0.3 + pulseIntensity * 0.2}
        style={{transition: 'stroke-width 0.1s, opacity 0.1s'}}
      />
    </svg>
  );
};

export default MossyFaceAvatar;
