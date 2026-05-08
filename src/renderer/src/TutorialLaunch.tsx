/**
 * Tutorial Launch Prompt
 * 
 * Appears after onboarding completes
 * Asks user if they want to start the interactive tutorial
 */

import React from 'react';
import { BrainCircuit, Play, X, BookOpen } from 'lucide-react';

interface TutorialLaunchProps {
  onStartTutorial: () => void;
  onSkip: () => void;
}

export const TutorialLaunch: React.FC<TutorialLaunchProps> = ({ 
  onStartTutorial, 
  onSkip 
}) => {
  return (
    <div className="fixed inset-0 bg-black/90 z-[200] flex items-center justify-center p-6">
      <div className="max-w-2xl w-full bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 border-2 border-emerald-500/40 rounded-2xl shadow-2xl overflow-hidden">
        {/* Animated Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 via-transparent to-blue-500/5 pointer-events-none" />
        
        {/* Header */}
        <div className="relative bg-gradient-to-r from-emerald-500/20 to-blue-500/20 border-b border-emerald-500/30 px-8 py-6">
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 bg-emerald-500/20 rounded-full flex items-center justify-center border-2 border-emerald-500/40 animate-pulse">
              <BrainCircuit className="w-10 h-10 text-emerald-400" />
            </div>
            <div>
              <h2 className="text-3xl font-bold text-white mb-1">
                Setup Complete! 🎉
              </h2>
              <p className="text-emerald-400 font-medium">
                Great work! Mossy is ready to guide you.
              </p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="relative px-8 py-8 space-y-6">
          {/* Mossy's Message */}
          <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-emerald-500/20 rounded-full flex items-center justify-center border border-emerald-500/40 flex-shrink-0">
                <BrainCircuit className="w-6 h-6 text-emerald-400" />
              </div>
              <div>
                <div className="text-xs text-emerald-400 font-bold uppercase tracking-wider mb-2">
                  Mossy Says:
                </div>
                <p className="text-slate-200 text-lg leading-relaxed mb-4">
                  Hi there! I'm Mossy, your AI modding assistant. 👋
                </p>
                <p className="text-slate-300 leading-relaxed">
                  I've detected your modding tools and I'm ready to help you create amazing Fallout 4 mods! 
                  Would you like me to give you a quick tour? I'll show you the most important features 
                  and teach you how to use them. <span className="text-emerald-400 font-medium">It only takes 3-5 minutes!</span>
                </p>
              </div>
            </div>
          </div>

          {/* What You'll Learn */}
          <div>
            <h3 className="text-white font-bold mb-3 flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-blue-400" />
              What You'll Learn:
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-slate-800/30 border border-slate-700/50 rounded-lg p-3">
                <div className="text-emerald-400 font-medium text-sm mb-1">✨ The Nexus</div>
                <div className="text-slate-400 text-xs">Your mission control dashboard</div>
              </div>
              <div className="bg-slate-800/30 border border-slate-700/50 rounded-lg p-3">
                <div className="text-emerald-400 font-medium text-sm mb-1">💬 Chat with Mossy</div>
                <div className="text-slate-400 text-xs">Ask questions, get answers</div>
              </div>
              <div className="bg-slate-800/30 border border-slate-700/50 rounded-lg p-3">
                <div className="text-emerald-400 font-medium text-sm mb-1">🔍 The Auditor</div>
                <div className="text-slate-400 text-xs">Check files for errors</div>
              </div>
              <div className="bg-slate-800/30 border border-slate-700/50 rounded-lg p-3">
                <div className="text-emerald-400 font-medium text-sm mb-1">🎨 Image Suite</div>
                <div className="text-slate-400 text-xs">Create textures & maps</div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 pt-4">
            <button
              onClick={onStartTutorial}
              className="flex-1 bg-gradient-to-r from-emerald-500 to-blue-500 hover:from-emerald-600 hover:to-blue-600 text-white font-bold py-4 px-6 rounded-xl transition-all transform hover:scale-105 shadow-lg flex items-center justify-center gap-3"
            >
              <Play className="w-5 h-5" />
              Yes! Show Me Around
            </button>
            
            <button
              onClick={onSkip}
              className="flex-1 bg-slate-700 hover:bg-slate-600 text-white font-medium py-4 px-6 rounded-xl transition-colors flex items-center justify-center gap-3"
            >
              <X className="w-5 h-5" />
              Skip for Now
            </button>
          </div>

          {/* Skip Note */}
          <div className="text-center text-xs text-slate-500">
            💡 You can always start the tutorial later from Settings → Help & Tutorials
          </div>
        </div>
      </div>
    </div>
  );
};

export default TutorialLaunch;
