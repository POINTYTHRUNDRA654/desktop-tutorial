import React from 'react';
import { Shield, Cpu, Code2 } from 'lucide-react';
import AvatarCore from './AvatarCore';

interface MossyIdentityProps {
  mode?: 'compact' | 'full';
  className?: string;
}

/**
 * Mossy Identity Component - Displays Mossy's name, role, and capabilities
 * Helps users recognize and understand who they're interacting with
 */
const MossyIdentity: React.FC<MossyIdentityProps> = ({ mode = 'full', className = '' }) => {
  if (mode === 'compact') {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <AvatarCore className="w-6 h-6" />
        <span className="font-mono font-bold text-blue-400 text-sm">MOSSY AI</span>
      </div>
    );
  }

  return (
    <div className={`bg-black/40 border border-blue-400/40 rounded-xl p-6 backdrop-blur ${className}`} style={{boxShadow: '0 0 15px rgba(100,200,255,0.1)'}}>
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex gap-4">
          <AvatarCore className="w-16 h-16 border-2" />
          <div>
            <div className="text-blue-400 font-mono font-bold text-lg tracking-widest mb-1">MOSSY</div>
            <div className="text-slate-500 text-xs uppercase font-mono tracking-wider">Neural AI Assistant</div>
          </div>
        </div>
        <div className="w-3 h-3 bg-blue-400 rounded-full animate-pulse"></div>
      </div>

      {/* Version and Status */}
      <div className="mb-4 space-y-2 text-xs font-mono">
        <div className="flex justify-between">
          <span className="text-slate-500">Version:</span>
          <span className="text-blue-300">2.4</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-500">Status:</span>
          <span className="text-emerald-400">ONLINE</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-500">Core:</span>
          <span className="text-blue-300">FO4 Specialist</span>
        </div>
      </div>

      {/* Capabilities */}
      <div className="border-t border-blue-400/20 pt-4 mb-4">
        <div className="text-slate-500 text-xs uppercase font-mono mb-3 tracking-wider">Core Capabilities</div>
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <Code2 className="w-3 h-3 text-blue-400" />
            <span>Papyrus Script Generation & Optimization</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <Cpu className="w-3 h-3 text-blue-400" />
            <span>3D Mesh & NIF File Management</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <Shield className="w-3 h-3 text-blue-400" />
            <span>Quest & Dialogue System Design</span>
          </div>
        </div>
      </div>

      {/* Personality */}
      <div className="bg-blue-400/5 border border-blue-400/20 rounded p-3">
        <div className="text-slate-500 text-[10px] uppercase font-mono mb-2 tracking-wider">Designation</div>
        <p className="text-slate-400 text-xs leading-relaxed">
          I'm Mossy, your dedicated Fallout 4 modding companion. I combine deep knowledge of Creation Kit, Papyrus scripting, and 3D asset management to help you bring your modding vision to life.
        </p>
      </div>
    </div>
  );
};

export default MossyIdentity;
