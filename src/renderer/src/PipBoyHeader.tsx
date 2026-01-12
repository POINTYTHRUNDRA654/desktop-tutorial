/**
 * Pip-Boy Header Component
 * Displays an authentic Pip-Boy terminal header with Mossy branding
 */

import React from 'react';
import { Radio, Zap } from 'lucide-react';

interface PipBoyHeaderProps {
  status?: 'online' | 'offline' | 'processing';
  title?: string;
}

const PipBoyHeader: React.FC<PipBoyHeaderProps> = ({ 
  status = 'online', 
  title = 'MOSSY PIP-BOY v2.4' 
}) => {
  const statusColor = status === 'online' ? '#00ff00' : status === 'processing' ? '#ffcc00' : '#ff6666';
  const statusLabel = status === 'online' ? 'OPERATIONAL' : status === 'processing' ? 'PROCESSING' : 'OFFLINE';

  return (
    <div 
      style={{
        background: 'linear-gradient(135deg, #2d5016 0%, #1a2e0a 100%)',
        border: '2px solid #00d000',
        borderRadius: '4px',
        padding: '1rem',
        boxShadow: '0 0 20px rgba(0, 255, 0, 0.5), inset 0 1px 0 rgba(0, 255, 0, 0.3)',
        fontFamily: 'Orbitron, monospace',
        textShadow: '0 0 10px rgba(0, 255, 0, 0.5)',
        marginBottom: '1rem'
      }}
    >
      {/* Top Row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Radio style={{ width: '1rem', height: '1rem', color: '#00ff00', animation: 'spin 2s linear infinite' }} />
          <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '2px', color: '#00ff00', fontWeight: 'bold' }}>
            RobCo TERMLINK
          </span>
        </div>
        <span style={{ fontSize: '0.75rem', color: '#00d000', fontWeight: 'bold' }}>
          [STATUS: {statusLabel}]
        </span>
      </div>

      {/* Main Title */}
      <h1 style={{
        fontSize: '1.5rem',
        fontWeight: 900,
        color: '#00ff00',
        margin: '0.5rem 0',
        letterSpacing: '2px',
        textTransform: 'uppercase'
      }}>
        {title}
      </h1>

      {/* Status Bar */}
      <div style={{
        display: 'flex',
        gap: '0.5rem',
        marginTop: '0.75rem',
        alignItems: 'center'
      }}>
        <div style={{
          flex: 1,
          height: '1.5rem',
          background: '#1a1f1a',
          border: '1px solid #00d000',
          borderRadius: '2px',
          overflow: 'hidden',
          position: 'relative'
        }}>
          <div style={{
            height: '100%',
            width: status === 'online' ? '100%' : status === 'processing' ? '75%' : '0%',
            background: `linear-gradient(90deg, #008000 0%, ${statusColor} 100%)`,
            boxShadow: `0 0 15px ${statusColor}`,
            transition: 'width 0.3s ease'
          }} />
        </div>
        <span style={{ fontSize: '0.625rem', color: statusColor, fontWeight: 'bold', minWidth: '60px' }}>
          {status === 'online' ? '100%' : status === 'processing' ? '75%' : '0%'}
        </span>
      </div>

      {/* Decorative Bottom Line */}
      <div style={{
        borderTop: '1px solid #00d000',
        marginTop: '0.75rem',
        paddingTop: '0.5rem'
      }}>
        <div style={{
          fontSize: '0.625rem',
          color: '#008000',
          fontFamily: 'monospace',
          letterSpacing: '1px'
        }}>
          &gt; SYSTEM INITIALIZED | AI CORE ACTIVE | AWAITING INPUT
        </div>
      </div>
    </div>
  );
};

export default PipBoyHeader;
