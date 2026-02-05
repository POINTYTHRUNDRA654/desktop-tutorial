import React from 'react';
import { Lightbulb, Zap, Play } from 'lucide-react';

interface TourLauncherProps {
  className?: string;
}

const TourLauncher: React.FC<TourLauncherProps> = ({ className = '' }) => {
  const startWelcomeTour = () => {
    window.dispatchEvent(new CustomEvent('start-welcome-tour'));
  };

  const startFeatureTour = () => {
    window.dispatchEvent(new CustomEvent('start-feature-tour'));
  };

  const startModuleTour = (module: string) => {
    window.dispatchEvent(new CustomEvent('start-module-tour', { detail: { module } }));
  };

  return (
    <div className={`p-4 bg-slate-800/50 rounded-lg border border-slate-700 ${className}`}>
      <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
        <Lightbulb className="w-4 h-4 text-yellow-400" />
        Guided Tours
      </h3>

      <div className="space-y-2">
        <button
          onClick={startWelcomeTour}
          className="w-full flex items-center gap-2 px-3 py-2 bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/30 rounded text-sm text-emerald-300 hover:text-emerald-200 transition-colors"
        >
          <Play className="w-3 h-3" />
          Welcome Tour
        </button>

        <button
          onClick={startFeatureTour}
          className="w-full flex items-center gap-2 px-3 py-2 bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/30 rounded text-sm text-blue-300 hover:text-blue-200 transition-colors"
        >
          <Zap className="w-3 h-3" />
          Feature Spotlight
        </button>

        <button
          onClick={() => startModuleTour('workshop')}
          className="w-full flex items-center gap-2 px-3 py-2 bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/30 rounded text-sm text-purple-300 hover:text-purple-200 transition-colors"
        >
          <Play className="w-3 h-3" />
          Workshop Tour
        </button>
      </div>

      <p className="text-xs text-slate-500 mt-3">
        Use these buttons to test the interactive guided tours powered by react-joyride.
      </p>
    </div>
  );
};

export default TourLauncher;