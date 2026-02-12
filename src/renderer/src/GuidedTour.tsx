import React, { useState, useEffect, useRef } from 'react';
import Joyride, { CallBackProps, STATUS, EVENTS, Step } from 'react-joyride';
import { useLocation, useNavigate } from 'react-router-dom';
import { BrainCircuit, Mic2, Command, Zap, Search, Layers, FileCode, Monitor } from 'lucide-react';
import { speakMossy } from './mossyTts';

interface GuidedTourProps {
  isOpen: boolean;
  onClose: () => void;
  tourType: 'welcome' | 'module-intro' | 'feature-spotlight';
  targetModule?: string;
}

type TourStepData = {
  narration?: string;
  route?: string;
  stepId?: string;
};

const GuidedTour: React.FC<GuidedTourProps> = ({ isOpen, onClose, tourType, targetModule }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [run, setRun] = useState(false);
  const [pendingRoute, setPendingRoute] = useState<string | null>(null);
  const lastSpokenStepId = useRef<string | null>(null);
  const visualGuideSrc = (name: string) => `/visual-guide-images/${encodeURIComponent(name)}`;

  const renderGuideImage = (name: string, alt: string) => (
    <div className="mt-3 rounded border border-slate-700/80 bg-slate-950/60 p-2">
      <img src={visualGuideSrc(name)} alt={alt} className="w-full max-h-40 object-cover rounded" loading="lazy" />
    </div>
  );

  useEffect(() => {
    if (isOpen) {
      // Small delay to ensure DOM is ready
      const timer = setTimeout(() => setRun(true), 500);
      return () => clearTimeout(timer);
    } else {
      setRun(false);
      setPendingRoute(null);
      lastSpokenStepId.current = null;
    }
  }, [isOpen]);

  useEffect(() => {
    if (!pendingRoute) return;
    if (location.pathname !== pendingRoute) return;
    const timer = setTimeout(() => {
      setRun(true);
      setPendingRoute(null);
    }, 250);
    return () => clearTimeout(timer);
  }, [location.pathname, pendingRoute]);

  const shouldSpeak = () => {
    try {
      return localStorage.getItem('mossy_voice_enabled') !== 'false';
    } catch {
      return true;
    }
  };

  const speakStep = (step?: Step) => {
    const data = (step?.data ?? {}) as TourStepData;
    if (!data.narration || !shouldSpeak()) return;
    const stepId = data.stepId ?? data.narration;
    if (lastSpokenStepId.current === stepId) return;
    lastSpokenStepId.current = stepId;
    void speakMossy(data.narration, { cancelExisting: true });
  };

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
            data: {
              stepId: 'welcome-intro',
              narration: 'Welcome to Mossy. I will walk you through the core areas of the app so you know where everything lives.'
            } satisfies TourStepData,
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
            data: {
              stepId: 'welcome-sidebar',
              narration: 'On the left is the navigation sidebar. Each module here opens a different tool, guide, or workflow.'
            } satisfies TourStepData,
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
            data: {
              stepId: 'welcome-command',
              narration: 'Use the command palette for fast navigation and actions. Press Control K any time to open it.'
            } satisfies TourStepData,
          },
          {
            target: '[data-tour="sidebar"]',
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
            placement: 'right',
            data: {
              stepId: 'welcome-voice',
              narration: 'Voice mode lets you talk to me hands free. You can enable it in Live Voice and configure speech settings in Settings.'
            } satisfies TourStepData,
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
            data: {
              stepId: 'welcome-main',
              narration: 'This main workspace is where each module renders its tools and panels. I will now take you through the key pages.'
            } satisfies TourStepData,
          },
          {
            target: 'body',
            placement: 'center',
            disableBeacon: true,
            content: (
              <div>
                <h4 className="font-bold text-white mb-2 flex items-center gap-2">
                  <BrainCircuit className="w-4 h-4" />
                  The Nexus
                </h4>
                <p className="text-slate-300 text-sm">
                  This dashboard shows system health, quick actions, and a summary of your current status.
                </p>
                {renderGuideImage("Page one. Mossy's space..png", 'Nexus overview')}
              </div>
            ),
            data: {
              stepId: 'page-nexus',
              route: '/',
              narration: 'This is the Nexus dashboard. It shows system health, quick actions, and your overall status at a glance.'
            } satisfies TourStepData,
          },
          {
            target: 'body',
            placement: 'center',
            disableBeacon: true,
            content: (
              <div>
                <h4 className="font-bold text-white mb-2">Chat Interface</h4>
                <p className="text-slate-300 text-sm">
                  Ask Mossy anything. Use chat for guidance, research, and step-by-step help.
                </p>
                {renderGuideImage('Page two. AI Chat..png', 'Chat interface')}
              </div>
            ),
            data: {
              stepId: 'page-chat',
              route: '/chat',
              narration: 'This is the chat interface. Use it to ask questions, troubleshoot, or request step by step help.'
            } satisfies TourStepData,
          },
          {
            target: 'body',
            placement: 'center',
            disableBeacon: true,
            content: (
              <div>
                <h4 className="font-bold text-white mb-2">Live Voice</h4>
                <p className="text-slate-300 text-sm">
                  Talk to Mossy with real-time voice input and spoken responses.
                </p>
                {renderGuideImage('Page 35 Live Synapse..png', 'Live voice')}
              </div>
            ),
            data: {
              stepId: 'page-live',
              route: '/live',
              narration: 'Here is Live Voice. Use your microphone to talk to me and hear spoken responses.'
            } satisfies TourStepData,
          },
          {
            target: 'body',
            placement: 'center',
            disableBeacon: true,
            content: (
              <div>
                <h4 className="font-bold text-white mb-2">Workshop</h4>
                <p className="text-slate-300 text-sm">
                  The Workshop is your scripting and automation hub.
                </p>
                {renderGuideImage('Page 19, the workshop..png', 'Workshop')}
              </div>
            ),
            data: {
              stepId: 'page-workshop',
              route: '/dev/workshop',
              narration: 'This is the Workshop. Use it for scripting, automation, and developer tooling.'
            } satisfies TourStepData,
          },
          {
            target: 'body',
            placement: 'center',
            disableBeacon: true,
            content: (
              <div>
                <h4 className="font-bold text-white mb-2">The Auditor</h4>
                <p className="text-slate-300 text-sm">
                  Scan assets and plugins to catch issues and optimize performance.
                </p>
                {renderGuideImage('Page 21 the auditor..png', 'Auditor')}
              </div>
            ),
            data: {
              stepId: 'page-auditor',
              route: '/tools/auditor',
              narration: 'The Auditor analyzes assets and plugins for issues, warnings, and performance risks.'
            } satisfies TourStepData,
          },
          {
            target: 'body',
            placement: 'center',
            disableBeacon: true,
            content: (
              <div>
                <h4 className="font-bold text-white mb-2">Image Suite</h4>
                <p className="text-slate-300 text-sm">
                  Generate textures, tweak PBR maps, and manage images.
                </p>
                {renderGuideImage('Page 34 image Studio..png', 'Image suite')}
              </div>
            ),
            data: {
              stepId: 'page-images',
              route: '/media/images',
              narration: 'The Image Suite helps you generate and refine textures and PBR assets.'
            } satisfies TourStepData,
          },
          {
            target: 'body',
            placement: 'center',
            disableBeacon: true,
            content: (
              <div>
                <h4 className="font-bold text-white mb-2">Packaging Hub</h4>
                <p className="text-slate-300 text-sm">
                  Build releases and package your mods for distribution.
                </p>
                {renderGuideImage('Page 11. Packaging and release..png', 'Packaging and release')}
              </div>
            ),
            data: {
              stepId: 'page-packaging',
              route: '/packaging-release',
              narration: 'The Packaging Hub walks you through builds and release packaging.'
            } satisfies TourStepData,
          },
          {
            target: 'body',
            placement: 'center',
            disableBeacon: true,
            content: (
              <div>
                <h4 className="font-bold text-white mb-2">Learning Hub</h4>
                <p className="text-slate-300 text-sm">
                  Find guides, documentation, and curated modding knowledge.
                </p>
                {renderGuideImage('Page 8 knowledge search..png', 'Learning hub')}
              </div>
            ),
            data: {
              stepId: 'page-learning',
              route: '/learn',
              narration: 'The Learning Hub is your library of guides, references, and curated modding knowledge.'
            } satisfies TourStepData,
          },
          {
            target: 'body',
            placement: 'center',
            disableBeacon: true,
            content: (
              <div>
                <h4 className="font-bold text-white mb-2">You are ready</h4>
                <p className="text-slate-300 text-sm">
                  That is the core layout. You can revisit this tour any time from the sidebar.
                </p>
              </div>
            ),
            data: {
              stepId: 'page-finish',
              route: '/',
              narration: 'That completes the welcome tour. You can replay it any time from the sidebar.'
            } satisfies TourStepData,
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
    const { status, type, step } = data;

    if (status === STATUS.FINISHED || status === STATUS.SKIPPED) {
      setRun(false);
      onClose();
      return;
    }

    if (type === EVENTS.STEP_BEFORE) {
      const stepData = (step?.data ?? {}) as TourStepData;
      if (stepData.route && location.pathname !== stepData.route) {
        setRun(false);
        setPendingRoute(stepData.route);
        navigate(stepData.route);
        return;
      }
      speakStep(step);
    }

    if (type === EVENTS.TARGET_NOT_FOUND) {
      setRun(false);
      setTimeout(() => setRun(true), 0);
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