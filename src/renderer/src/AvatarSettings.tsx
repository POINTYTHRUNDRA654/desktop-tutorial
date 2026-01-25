/**
 * Avatar Settings Modal
 * Provides UI to upload and manage Mossy's face avatar
 */

import React, { useState } from 'react';
import { X } from 'lucide-react';
import AvatarCard from './AvatarCard';

interface AvatarSettingsProps {
  isOpen: boolean;
  onClose: () => void;
}

const AvatarSettings: React.FC<AvatarSettingsProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0, 0, 0, 0.7)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: 'linear-gradient(135deg, #1a1f1a 0%, #0f1f0f 100%)',
          border: '2px solid #00d000',
          borderRadius: '8px',
          padding: '2rem',
          maxWidth: '600px',
          width: '90%',
          maxHeight: '80vh',
          overflow: 'auto',
          boxShadow: '0 0 40px rgba(0, 255, 0, 0.4)'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header with close button */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <div
            style={{
              fontSize: '1rem',
              textTransform: 'uppercase',
              letterSpacing: '2px',
              color: '#00d000',
              fontWeight: 'bold',
              fontFamily: 'Orbitron, monospace'
            }}
          >
            &gt; AVATAR CONFIGURATION
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#00d000',
              cursor: 'pointer',
              fontSize: '1.5rem',
              padding: '0'
            }}
          >
            <X size={24} />
          </button>
        </div>

        {/* Avatar Card */}
        <AvatarCard />
      </div>
    </div>
  );
};

export default AvatarSettings;
