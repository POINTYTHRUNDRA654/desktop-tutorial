import React from 'react';
import { AlertCircle, Lock, Zap } from 'lucide-react';

/**
 * Fallout 4 Specialization Banner
 * Displays prominently to remind users this is Fallout 4 only
 */
const Fallout4SpecializationBanner: React.FC = () => {
  return (
    <div className="bg-gradient-to-r from-amber-900/20 to-orange-900/20 border-t border-b border-amber-600/30 px-6 py-3">
      <div className="flex items-center justify-between max-w-7xl mx-auto">
        {/* Left side: Lock icon + messaging */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Lock className="w-4 h-4 text-amber-500" />
            <span className="text-xs font-bold text-amber-300 uppercase tracking-widest">
              Fallout 4 Only
            </span>
          </div>
          <div className="hidden sm:block">
            <p className="text-xs text-amber-200">
              Mossy is specialized exclusively for Fallout 4 modding. Other game versions coming soon!
            </p>
          </div>
        </div>

        {/* Right side: Info icon with tooltip hint */}
        <div className="text-right">
          <p className="text-[10px] text-amber-300 font-mono">
            v2.4.2 • FO4 SPECIALIST
          </p>
        </div>
      </div>
    </div>
  );
};

export default Fallout4SpecializationBanner;
