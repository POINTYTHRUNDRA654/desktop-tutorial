import React from 'react';
import { Wrench, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

/**
 * LiveInterface - Maintenance Mode
 * 
 * The Live Voice Chat feature is temporarily disabled due to dependency 
 * compatibility issues with the @google/genai package. This page allows
 * users to navigate away safely while we resolve the import errors.
 * 
 * TODO: Re-enable when @google/genai import issues are resolved
 */
const LiveInterface: React.FC = () => {
  const navigate = useNavigate();
  
  return (
    <div className="h-full flex flex-col bg-[#050505] text-slate-200 relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-[#0f172a] via-[#050505] to-[#000000] z-0 pointer-events-none"></div>
      
      {/* Header with Back Button */}
      <div className="absolute top-0 left-0 w-full p-6 z-20 pointer-events-auto flex justify-between items-start">
        <button 
          onClick={() => navigate('/')}
          className="p-2 bg-slate-800 hover:bg-slate-700 rounded-full text-slate-400 hover:text-white transition-colors"
          title="Back to Home"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        
        <h2 className="text-2xl font-bold text-white tracking-widest flex items-center gap-2">
          MOSSY <span className="text-[10px] bg-slate-800 px-2 py-0.5 rounded text-amber-400 border border-amber-900">MAINTENANCE</span>
        </h2>
        
        <div className="w-8"></div>
      </div>

      {/* Main Content */}
      <div className="flex-1 relative z-10 flex items-center justify-center px-6">
        <div className="flex flex-col items-center gap-8 max-w-xl text-center">
          {/* Icon */}
          <div className="w-24 h-24 rounded-full border-2 border-amber-500/40 bg-amber-500/5 backdrop-blur-md flex items-center justify-center">
            <Wrench className="w-12 h-12 text-amber-400 animate-pulse" />
          </div>

          {/* Heading */}
          <div className="space-y-2">
            <h1 className="text-3xl font-bold text-amber-400">
              Feature Under Maintenance
            </h1>
            <p className="text-sm text-slate-500 tracking-wide uppercase">
              Live Voice Chat - Coming Soon
            </p>
          </div>

          {/* Description */}
          <div className="space-y-4 text-slate-400">
            <p>
              The Live Voice Chat feature is currently being enhanced. We're working to resolve some compatibility issues with our voice processing engine.
            </p>
            <p className="text-sm">
              <span className="text-amber-400 font-semibold">Expected availability:</span> Next update
            </p>
            <p className="text-sm">
              This feature will allow you to have real-time voice conversations with MOSSY AI, including avatar animation synchronization and advanced audio processing.
            </p>
          </div>

          {/* Return Button */}
          <button 
            onClick={() => navigate('/')}
            className="px-8 py-3 bg-emerald-900/30 hover:bg-emerald-900/50 border border-emerald-500/50 hover:border-emerald-400 text-emerald-400 hover:text-emerald-300 font-mono text-sm transition-all duration-300 rounded-full flex items-center gap-2 mt-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Return to Home
          </button>

          {/* Status Message */}
          <div className="text-[10px] text-slate-600 font-mono uppercase tracking-widest mt-8">
            <div className="flex items-center gap-2 justify-center">
              <div className="w-2 h-2 rounded-full bg-amber-500/60 animate-pulse"></div>
              Status: In Development
            </div>
          </div>
        </div>
      </div>

      {/* Footer Note */}
      <div className="absolute bottom-0 left-0 w-full p-6 z-20 text-center text-[10px] text-slate-600 font-mono border-t border-slate-800/50">
        <p>Check back soon for Live Voice Chat capabilities</p>
      </div>
    </div>
  );
};

export default LiveInterface;