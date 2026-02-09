import React from 'react';
import { Video, BookOpen, Zap, HelpCircle } from 'lucide-react';

const HomePage: React.FC = () => {
  const handleWatchTutorial = () => {
    window.dispatchEvent(new CustomEvent('open-video-tutorial'));
  };

  const handleStartInteractiveTutorial = () => {
    window.dispatchEvent(new CustomEvent('start-tutorial'));
  };

  return (
    <div className="h-full w-full flex items-center justify-center bg-[#0a0e0a] p-8">
      <div className="text-center max-w-4xl">
        <h1 className="text-4xl font-bold text-[#00ff00] mb-4">🚀 MOSSY LOADED</h1>
        <p className="text-[#00ff00] text-lg mb-12">Your AI-powered Fallout 4 modding assistant</p>
        
        {/* Tutorial Options */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
          {/* Video Tutorial Card */}
          <div className="bg-gradient-to-br from-purple-900/30 to-blue-900/30 border-2 border-purple-500/50 rounded-xl p-8 hover:border-purple-400 transition-all cursor-pointer group"
               onClick={handleWatchTutorial}>
            <div className="flex justify-center mb-4">
              <div className="p-4 bg-purple-500/20 rounded-full group-hover:bg-purple-500/30 transition-all">
                <Video className="w-12 h-12 text-purple-400" />
              </div>
            </div>
            <h2 className="text-2xl font-bold text-white mb-3">Watch Video Tutorial</h2>
            <p className="text-slate-300 text-sm mb-4">
              Learn how to use Mossy with a comprehensive video walkthrough. 
              Perfect for visual learners who want to see the app in action.
            </p>
            <div className="flex items-center justify-center gap-2 text-purple-400 font-medium">
              <span>Start Watching</span>
              <Zap className="w-4 h-4" />
            </div>
          </div>

          {/* Interactive Tutorial Card */}
          <div className="bg-gradient-to-br from-emerald-900/30 to-teal-900/30 border-2 border-emerald-500/50 rounded-xl p-8 hover:border-emerald-400 transition-all cursor-pointer group"
               onClick={handleStartInteractiveTutorial}>
            <div className="flex justify-center mb-4">
              <div className="p-4 bg-emerald-500/20 rounded-full group-hover:bg-emerald-500/30 transition-all">
                <BookOpen className="w-12 h-12 text-emerald-400" />
              </div>
            </div>
            <h2 className="text-2xl font-bold text-white mb-3">Interactive Walkthrough</h2>
            <p className="text-slate-300 text-sm mb-4">
              Follow a step-by-step guided tour through Mossy's interface. 
              Learn by doing with hands-on interactive tutorials.
            </p>
            <div className="flex items-center justify-center gap-2 text-emerald-400 font-medium">
              <span>Start Tutorial</span>
              <Zap className="w-4 h-4" />
            </div>
          </div>
        </div>

        {/* Quick Help */}
        <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-6">
          <div className="flex items-start gap-4">
            <div className="p-2 bg-blue-500/20 rounded-lg">
              <HelpCircle className="w-6 h-6 text-blue-400" />
            </div>
            <div className="text-left flex-1">
              <h3 className="text-white font-semibold mb-2">Need Quick Help?</h3>
              <p className="text-slate-400 text-sm mb-3">
                Press <kbd className="px-2 py-1 bg-slate-900 border border-slate-700 rounded text-xs font-mono">Ctrl+K</kbd> or <kbd className="px-2 py-1 bg-slate-900 border border-slate-700 rounded text-xs font-mono">Cmd+K</kbd> to open the command palette and search for any feature.
              </p>
              <ul className="text-slate-400 text-sm space-y-1">
                <li>• Navigate the sidebar to explore different modules</li>
                <li>• Use the AI Chat to ask questions about Fallout 4 modding</li>
                <li>• Check the Knowledge Search for detailed documentation</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HomePage;
