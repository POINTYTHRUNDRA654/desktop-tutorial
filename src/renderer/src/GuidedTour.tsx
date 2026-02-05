import React, { useState, useEffect } from 'react';
import Joyride, { CallBackProps, STATUS, EVENTS, Step } from 'react-joyride';
import { useLocation, useNavigate } from 'react-router-dom';
import { BrainCircuit, Terminal, Mic2, Command, Zap, Settings, Search, Layers, FileCode, Monitor } from 'lucide-react';

interface GuidedTourProps {
  isOpen: boolean;
  onClose: () => void;
  tourType: 'welcome' | 'module-intro' | 'feature-spotlight';
  targetModule?: string;
}

const GuidedTour: React.FC<GuidedTourProps> = ({ isOpen, onClose, tourType, targetModule }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [run, setRun] = useState(false);

  useEffect(() => {
    if (isOpen) {
      // Small delay to ensure DOM is ready
      const timer = setTimeout(() => setRun(true), 500);
      return () => clearTimeout(timer);
    } else {
      setRun(false);
    }
  }, [isOpen]);

  const getSteps = (): Step[] => {
    switch (tourType) {
      case 'welcome':
        return [
          {
            target: 'body',
            content: (
              <div className="text-center">
                <div className="flex justify-center mb-4">
                  <div className="w-16 h-16 bg-emerald-500/10 rounded-full flex items-center justify-center border border-emerald-500/30">
                    <BrainCircuit className="w-8 h-8 text-emerald-400" />
                  </div>
                </div>
                <h3 className="text-lg font-bold text-white mb-2">Welcome to Mossy!</h3>
                <p className="text-slate-300 text-sm">
                  I'm your AI-powered Fallout 4 modding assistant. Let me show you around the interface.
                </p>
              </div>
            ),
            placement: 'center',
            disableBeacon: true,
          },
          {
            target: '[data-tour="sidebar"]',
            content: (
              <div>
                <h4 className="font-bold text-white mb-2 flex items-center gap-2">
                  <Layers className="w-4 h-4" />
                  Neural Modules
                </h4>
                <p className="text-slate-300 text-sm mb-3">
                  This sidebar contains all your modding tools and AI modules. Each module is designed for specific tasks.
                </p>
                <div className="bg-slate-800/50 p-3 rounded border border-slate-700">
                  <p className="text-xs text-slate-400">
                    💡 <strong>Pro tip:</strong> Use the search bar to quickly find any module.
                  </p>
                </div>
              </div>
            ),
            placement: 'right',
          },
          {
            target: '[data-tour="command-palette-trigger"]',
            content: (
              <div>
                <h4 className="font-bold text-white mb-2 flex items-center gap-2">
                  <Command className="w-4 h-4" />
                  Command Palette
                </h4>
                <p className="text-slate-300 text-sm mb-3">
                  Press <kbd className="bg-slate-700 px-2 py-1 rounded text-xs">Ctrl+K</kbd> anywhere to open the command palette.
                  It's your fastest way to navigate, run commands, or ask me questions.
                </p>
              </div>
            ),
            placement: 'bottom',
          },
          {
            target: '[data-tour="voice-toggle"]',
            content: (
              <div>
                <h4 className="font-bold text-white mb-2 flex items-center gap-2">
                  <Mic2 className="w-4 h-4" />
                  Voice Interface
                </h4>
                <p className="text-slate-300 text-sm mb-3">
                  Enable voice mode for hands-free operation. I can listen to your commands and respond naturally.
                </p>
                <div className="bg-blue-900/20 border border-blue-500/30 p-3 rounded">
                  <p className="text-xs text-blue-300">
                    🎤 <strong>Voice commands:</strong> "Open the workshop", "Analyze this NIF file", "Show me texture options"
                  </p>
                </div>
              </div>
            ),
            placement: 'top',
          },
          {
            target: '[data-tour="main-content"]',
            content: (
              <div>
                <h4 className="font-bold text-white mb-2 flex items-center gap-2">
                  <Monitor className="w-4 h-4" />
                  Main Workspace
                </h4>
                <p className="text-slate-300 text-sm mb-3">
                  This is where you'll work with different modules. Each module provides specialized tools for modding tasks.
                </p>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="bg-slate-800/50 p-2 rounded border border-slate-700">
                    <FileCode className="w-3 h-3 inline mr-1" />
                    Workshop - Code editor
                  </div>
                  <div className="bg-slate-800/50 p-2 rounded border border-slate-700">
                    <Search className="w-3 h-3 inline mr-1" />
                    Auditor - File analysis
                  </div>
                </div>
              </div>
            ),
            placement: 'center',
          },
        ];

      case 'module-intro':
        return [
          {
            target: '[data-tour="main-content"]',
            content: (
              <div>
                <h4 className="font-bold text-white mb-2">Module: {targetModule}</h4>
                <p className="text-slate-300 text-sm">
                  This module provides specialized tools for {getModuleDescription(targetModule)}.
                </p>
              </div>
            ),
            placement: 'center',
            disableBeacon: true,
          },
        ];

      case 'feature-spotlight':
        return [
          {
            target: '[data-tour="command-palette-trigger"]',
            content: (
              <div>
                <h4 className="font-bold text-white mb-2 flex items-center gap-2">
                  <Zap className="w-4 h-4" />
                  New Feature: Enhanced Commands
                </h4>
                <p className="text-slate-300 text-sm mb-3">
                  Try the new fuzzy search and AI-powered suggestions in the command palette!
                </p>
                <div className="bg-emerald-900/20 border border-emerald-500/30 p-3 rounded">
                  <p className="text-xs text-emerald-300">
                    ✨ <strong>New:</strong> Type natural language queries like "optimize textures" or "check for conflicts"
                  </p>
                </div>
              </div>
            ),
            placement: 'bottom',
            disableBeacon: true,
          },
        ];

      default:
        return [];
    }
  };

  const getModuleDescription = (module?: string): string => {
    const descriptions: Record<string, string> = {
      'workshop': 'scripting and visual programming',
      'auditor': 'asset validation and performance analysis',
      'vault': 'asset management and organization',
      'holodeck': 'testing and validation',
      'assembler': 'FOMOD package creation',
      'cortex': 'knowledge base and documentation',
    };
    return descriptions[module || ''] || 'various modding tasks';
  };

  const handleJoyrideCallback = (data: CallBackProps) => {
    const { status, type } = data;

    if (status === STATUS.FINISHED || status === STATUS.SKIPPED) {
      setRun(false);
      onClose();
    }
  };

  const steps = getSteps();

  if (!isOpen || steps.length === 0) return null;

  return (
    <Joyride
      steps={steps}
      run={run}
      continuous={true}
      showProgress={true}
      showSkipButton={true}
      callback={handleJoyrideCallback}
      styles={{
        options: {
          primaryColor: '#10b981', // emerald-500
          backgroundColor: '#0f172a', // slate-900
          textColor: '#e2e8f0', // slate-200
          overlayColor: 'rgba(0, 0, 0, 0.8)',
          spotlightShadow: '0 0 15px rgba(16, 185, 129, 0.5)',
          beaconSize: 36,
          zIndex: 100,
        },
        tooltip: {
          backgroundColor: '#0f172a',
          borderRadius: 8,
          fontSize: 14,
          padding: 20,
        },
        tooltipContainer: {
          textAlign: 'left',
        },
        buttonNext: {
          backgroundColor: '#10b981',
          fontSize: 14,
          fontWeight: 'bold',
        },
        buttonBack: {
          color: '#64748b',
          marginLeft: 'auto',
          marginRight: 5,
        },
        buttonSkip: {
          color: '#64748b',
        },
        buttonClose: {
          height: 14,
          width: 14,
          top: 15,
          right: 15,
        },
      }}
      locale={{
        back: 'Back',
        close: 'Close',
        last: 'Finish',
        next: 'Next',
        open: 'Open',
        skip: 'Skip',
      }}
    />
  );
};

export default GuidedTour;