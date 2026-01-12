/**
 * Mossy Avatar Display Card
 * Shows the AI avatar/face in a Pip-Boy themed card
 */

import React from 'react';
import AvatarCore from './AvatarCore';
import { useLive } from './LiveContext';

const AvatarCard: React.FC = () => {
  const { customAvatar, mode, volume } = useLive();

  return (
    <div
      style={{
        background: 'linear-gradient(135deg, #1a1f1a 0%, #0f1f0f 100%)',
        border: '2px solid #00d000',
        borderRadius: '4px',
        padding: '1.5rem',
        boxShadow: '0 0 25px rgba(0, 255, 0, 0.4)',
        textAlign: 'center',
        fontFamily: 'Orbitron, monospace'
      }}
    >
      {/* Header */}
      <div
        style={{
          fontSize: '0.75rem',
          textTransform: 'uppercase',
          letterSpacing: '2px',
          color: '#00d000',
          marginBottom: '1rem',
          fontWeight: 'bold'
        }}
      >
        &gt; AI AVATAR CORE
      </div>

      {/* Avatar Display */}
      <div
        style={{
          width: '150px',
          height: '150px',
          margin: '0 auto 1rem',
          position: 'relative',
          border: '1px solid #00d000',
          borderRadius: '4px',
          overflow: 'hidden',
          background: '#0a0e0a',
          boxShadow: 'inset 0 0 20px rgba(0, 255, 0, 0.2)'
        }}
      >
        <AvatarCore showRings={true} className="w-full h-full" />
      </div>

      {/* Status */}
      <div style={{ marginTop: '1rem', borderTop: '1px solid #00d000', paddingTop: '1rem' }}>
        <div
          style={{
            fontSize: '0.625rem',
            color: '#008000',
            marginBottom: '0.5rem',
            fontFamily: 'monospace'
          }}
        >
          MODE: <span style={{ color: mode === 'listening' ? '#ffcc00' : mode === 'processing' ? '#ff00ff' : mode === 'speaking' ? '#00ff00' : '#00d000' }}>
            {mode === 'listening' ? 'LISTENING' : mode === 'processing' ? 'PROCESSING' : mode === 'speaking' ? 'SPEAKING' : 'IDLE'}
          </span>
        </div>
        <div
          style={{
            fontSize: '0.625rem',
            color: '#008000',
            fontFamily: 'monospace'
          }}
        >
          VOLUME: <span style={{ color: '#00ff00' }}>{Math.round(volume)}%</span>
        </div>
      </div>
    </div>
  );
};

export default AvatarCard;
