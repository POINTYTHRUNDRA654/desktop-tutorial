import React from 'react';
import AvatarCore from './AvatarCore';
import { useLive } from './LiveContext';

// Floating overlay for persistent avatar presence
const AvatarOverlay: React.FC = () => {
  let liveContext: any = null;
  try {
    liveContext = useLive();
  } catch (err) {
    console.warn('[AvatarOverlay] LiveContext not available, using fallback');
    return null; // Don't render if context isn't available
  }
  const { mode, isActive, connect, disconnect } = liveContext;

  const handleClick = async () => {
    console.log('[AvatarOverlay] Avatar clicked, isActive:', isActive);
    try {
      if (!connect || !disconnect) {
        console.error('[AvatarOverlay] Connect or disconnect functions not available');
        alert('Voice chat functions not available. Please refresh the app.');
        return;
      }
      
      if (isActive) {
        console.log('[AvatarOverlay] Calling disconnect...');
        disconnect();
      } else {
        console.log('[AvatarOverlay] Calling connect...');
        await connect();
        console.log('[AvatarOverlay] Connect completed successfully');
      }
    } catch (err: any) {
      console.error('[AvatarOverlay] Click handler error:', err);
      console.error('[AvatarOverlay] Error stack:', err?.stack);
      alert(`Voice chat error: ${err?.message || 'Unknown error'}`);
    }
  };

  // Animate or highlight when avatar is active or speaking
  const borderColor = mode === 'speaking' ? '#60a5fa' : '#3b82f644';
  const boxShadow = isActive ? '0 0 30px rgba(59,130,246,0.4)' : '0 0 10px rgba(59,130,246,0.1)';

  return (
    <div
      onClick={handleClick}
      style={{
        position: 'fixed',
        bottom: 32,
        right: 32,
        zIndex: 1000,
        width: 80,
        height: 80,
        borderRadius: '50%',
        background: 'rgba(15,23,42,0.95)',
        border: `2px solid ${borderColor}`,
        boxShadow,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'box-shadow 0.3s, border-color 0.3s',
        cursor: 'pointer',
        userSelect: 'none',
      }}
      title={isActive ? "Click to disconnect" : "Click to start live voice chat"}
    >
      <AvatarCore showRings={false} className="w-full h-full" />
    </div>
  );
};

export default AvatarOverlay;
