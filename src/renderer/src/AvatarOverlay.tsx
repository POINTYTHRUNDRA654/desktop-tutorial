import React from 'react';
import AvatarCore from './AvatarCore';
import { useLive } from './LiveContext';

// Floating overlay for persistent avatar presence
const AvatarOverlay: React.FC = () => {
  const { mode, isActive } = useLive();

  // Animate or highlight when avatar is active or speaking
  const borderColor = mode === 'speaking' ? '#00ff99' : '#00d000';
  const boxShadow = isActive ? '0 0 24px #00ff99, 0 0 8px #00d000' : '0 0 8px #00d000';

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 32,
        right: 32,
        zIndex: 1000,
        width: 72,
        height: 72,
        borderRadius: '50%',
        background: 'rgba(10,20,10,0.95)',
        border: `2.5px solid ${borderColor}`,
        boxShadow,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'box-shadow 0.3s, border-color 0.3s',
        cursor: 'pointer',
        userSelect: 'none',
      }}
      title="Mossy is with you!"
    >
      <AvatarCore showRings={false} className="w-full h-full" />
    </div>
  );
};

export default AvatarOverlay;
