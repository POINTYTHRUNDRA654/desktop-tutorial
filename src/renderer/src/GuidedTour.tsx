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
  const visualGuideSrc = (name: string) => {
    const encoded = encodeURIComponent(name);
    if (typeof window !== 'undefined' && window.location.protocol === 'file:') {
      return `./visual-guide-images/${encoded}`;
    }
    return `/visual-guide-images/${encoded}`;
  };

  const renderGuideImage = (name: string, alt: string) => (
    <div className="mt-3 rounded border border-slate-700/80 bg-slate-950/60 p-2">
      <img src={visualGuideSrc(name)} alt={alt} className="w-full max-h-40 object-cover rounded" loading="lazy" />
    </div>
  );

  useEffect(() => {
    // Add data attribute to body when tour is active
    if (isOpen && run) {
      document.body.setAttribute('data-guided-tour-active', 'true');
    } else {
      document.body.removeAttribute('data-guided-tour-active');
    }
    return () => {
      document.body.removeAttribute('data-guided-tour-active');
    };
  }, [isOpen, run]);

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

                <div className="bg-slate-900/50 border border-slate-700 rounded p-3 font-mono text-xs leading-tight text-emerald-300">
                  <div className="font-semibold text-emerald-300 mb-2">MOSSY.SPACE — NEURAL ENVIRONMENT · 1.0</div>
                  <div>Tools / Install / Verify (No Guest)</div>

                  <div className="mt-3"><strong>The Nexus is your home dashboard:</strong> it keeps you oriented.</div>

                  <div className="mt-3 font-semibold">Tools</div>
                  <div>No external tools required for this part</div>

                  <div className="mt-3 font-semibold">Verify (quick)</div>
                  <div>Confirm health badges render and reflect your status.</div>
                  <div>Open Diagnostics and return back without navigation errors.</div>

                  <div className="mt-3 font-semibold">First test loop</div>
                  <div>Run Install Wizard once to detect tools and set up paths.</div>
                  <div>Open Chat and confirm you can send a message and receive a response.</div>
                  <div>Open Desktop Bridge and confirm ONLINE if you use local features.</div>

                  <div className="mt-3 font-semibold">Troubleshooting</div>
                  <div>If Electron shows WARN/BAD, you may be running web mode or preload failed.</div>
                  <div>If Mic/TTS show WARN, check permissions in your OS and retry.</div>

                  <div className="mt-4 text-center uppercase text-xs text-slate-400">CORE INITIALIZED. GOOD AFTERNOON.</div>
                  <div className="text-center text-xs text-slate-500 mt-1">THE NEURAL LINK IS ACTIVE AND MONITORING YOUR WORKSPACE</div>
                </div>

                {renderGuideImage("Page one. Mossy's space..png", 'Nexus overview')}
              </div>
            ),
            data: {
              stepId: 'page-nexus',
              route: '/',
              narration: 'Mossy.Space — Nexus dashboard. Verify health badges, run Install Wizard, open Chat and Desktop Bridge; troubleshoot Electron or Mic/TTS warnings.'
            } satisfies TourStepData,
          },
          {
            target: 'body',
            placement: 'center',
            disableBeacon: true,
            content: (
              <div>
                <h4 className="font-bold text-white mb-2">Chat Interface</h4>

                <div className="bg-slate-900/50 border border-slate-700 rounded p-3 font-mono text-xs leading-tight text-emerald-300">
                  <div className="font-semibold text-emerald-300 mb-2">MOSSY — FO4 EDITION</div>
                  <div>Tools / Install / Verify (No Guesswork)</div>
                  <div className="mt-2">Chat is the main interface. Optional features (desktop actions) require the relevant integrations to be active.</div>

                  <div className="mt-3 font-semibold">Tools</div>
                  <div>No external tools required for this page.</div>

                  <div className="mt-3 font-semibold">Verify (quick)</div>
                  <div>Send a short message and confirm you receive a response.</div>
                  <div>Confirm citations can expand and collapse.</div>

                  <div className="mt-3 font-semibold">First test loop</div>
                  <div>Ask Mossy for a tiny "hello world" FO4 mod plan (one record or one script).</div>
                  <div>Execute exactly one action (generate text or analyze a file) and confirm the output is usable.</div>

                  <div className="mt-3 font-semibold">Troubleshooting</div>
                  <div>If responses fail, check Settings for API key/model configuration.</div>
                  <div>If desktop actions fail, confirm Desktop Bridge/Electron API is available.</div>
                </div>

                <div className="mt-3 bg-slate-800/20 border border-slate-700 rounded p-2 text-sm">
                  <div className="font-mono text-emerald-300 text-xs">MOSSY</div>
                  <div className="text-slate-200 font-semibold">👋 Welcome back, Vault Dweller!</div>
                  <div className="text-slate-400 text-sm mt-1">What are we working on today?</div>
                </div>

                {renderGuideImage('page-2-ai-chat.png', 'Chat interface')}
              </div>
            ),
            data: {
              stepId: 'page-chat',
              route: '/chat',
              narration: 'Chat is the main interface — send a short message, verify citations and responses, test a tiny "hello world" FO4 mod plan; check API keys or Desktop Bridge if actions fail.'
            } satisfies TourStepData,
          },
          {
            target: 'body',
            placement: 'center',
            disableBeacon: true,
            content: (
              <div>
                <h4 className="font-bold text-white mb-2">AI Mod Assistant - Chat</h4>

                <div className="bg-slate-900/50 border border-slate-700 rounded p-3 font-mono text-xs leading-tight text-emerald-300">
                  <div className="font-semibold text-emerald-300 mb-2">AI MOD ASSISTANT - CHAT</div>
                  <div>Start a conversation - ask for code, fixes, or smart actions.</div>

                  <div className="mt-3 font-semibold">Prompt</div>
                  <div>Ask the assistant or paste code...</div>

                  <div className="mt-3 font-semibold">Smart Actions</div>
                  <div className="grid grid-cols-4 gap-2 text-xs mt-2">
                    <div className="bg-transparent border border-emerald-500 rounded py-2 text-center">GENERATE SCRIPT</div>
                    <div className="bg-transparent border border-emerald-500 rounded py-2 text-center">INLINE SUGGESTIONS</div>
                    <div className="bg-transparent border border-emerald-500 rounded py-2 text-center">REFACTOR</div>
                    <div className="bg-transparent border border-emerald-500 rounded py-2 text-center">QUICK FIX</div>
                  </div>

                  <div className="mt-3 font-semibold">Code Assistant</div>
                  <div>Inline suggestions, quick fixes, and refactoring previews appear here.</div>
                  <div className="mt-1 text-slate-400">No code preview</div>

                  <div className="mt-3 font-semibold">Suggestions</div>
                  <div className="text-slate-400">No suggestions</div>

                  <div className="mt-3 font-semibold">Learning Mode</div>
                  <div className="text-slate-400">Off</div>
                </div>

                {renderGuideImage('page-3-ai-mod-assistant.png', 'AI Mod Assistant')}
              </div>
            ),
            data: {
              stepId: 'page-mod-assistant',
              route: '/ai-mod-assistant',
              narration: 'AI Mod Assistant — chat-driven code and smart actions. Paste code or ask for fixes, use Smart Actions (Generate Script, Inline Suggestions, Refactor, Quick Fix), and check Code Assistant for previews or suggestions.'
            } satisfies TourStepData,
          },

          {
            target: 'body',
            placement: 'center',
            disableBeacon: true,
            content: (
              <div>
                <h4 className="font-bold text-white mb-2">First Success Wizard</h4>

                <div className="bg-slate-900/50 border border-slate-700 rounded p-3 font-mono text-xs leading-tight text-emerald-300">
                  <div className="font-semibold text-emerald-300 mb-2">✅ FIRST SUCCESS WIZARD</div>
                  <div>A quick path to your first win. Each step uses real tools already in Mossy.</div>

                  <div className="mt-3"><strong>1) Run a system scan</strong></div>
                  <div className="text-slate-400">Detect installed tools so Mossy can personalize her guidance.</div>
                  <div className="text-slate-500 italic">Open System Hub → Diagnostics and run the scan once.</div>

                  <div className="mt-3"><strong>2) Verify your tools</strong></div>
                  <div className="text-slate-400">Confirm key modding tools are detected and configured.</div>
                  <div className="text-slate-500 italic">Use System Hub → Diagnostics to confirm paths and versions.</div>

                  <div className="mt-3"><strong>3) Index your guides</strong></div>
                  <div className="text-slate-400">Build the knowledge index or add your own notes to the Memory Vault.</div>
                  <div className="text-slate-500 italic">Use Knowledge Search to review built-in docs, then add your own notes to Memory Vault.</div>

                  <div className="mt-3"><strong>4) Digest your plugins with Spriggit (optional)</strong></div>
                  <div className="text-slate-400">If you have Spriggit installed, let Mossy serialize and learn your .esp/.esm/.esl files.</div>
                  <div className="text-slate-500 italic">Available at the end of the first-run setup wizard — or run it later from the Memory Vault.</div>

                  <div className="mt-3"><strong>5) Ask your first question</strong></div>
                  <div className="text-slate-400">Mossy will use your scans and knowledge vault to answer precisely.</div>
                  <div className="border border-emerald-800 bg-emerald-950/20 p-1 mt-1 text-emerald-400/80">
                    Example: How do I build a simple quest in the Creation Kit?
                  </div>

                  <div className="mt-3 text-slate-400">Done with the basics? Explore advanced modules when you are ready using the sidebar.</div>
                </div>

                {renderGuideImage('page-4-first-success.png', 'First Success Wizard')}
              </div>
            ),
            data: {
              stepId: 'page-first-success',
              route: '/journey-hub',
              narration: 'The First Success Wizard is a fast onboarding checklist. Run a system scan, verify your tools, index your guides, optionally digest your plugins with Spriggit, and ask your first question to get started.'
            } satisfies TourStepData,
          },

          {
            target: 'body',
            placement: 'center',
            disableBeacon: true,
            content: (
              <div>
                <h4 className="font-bold text-white mb-2">Mod Projects</h4>
                <p className="text-slate-300 text-sm">
                  Track and manage all of your active mod projects in one place. Create a project, set goals, and follow your progress from idea to release.
                </p>
                {renderGuideImage('page-7-mod-projects.png', 'Mod Projects')}
              </div>
            ),
            data: {
              stepId: 'page-mod-projects',
              route: '/journey-hub',
              narration: 'Mod Projects is your project manager — create a project, set goals, and track progress from first idea all the way to release.'
            } satisfies TourStepData,
          },

          {
            target: 'body',
            placement: 'center',
            disableBeacon: true,
            content: (
              <div>
                <h4 className="font-bold text-white mb-2">Modding Roadmaps</h4>
                <p className="text-slate-300 text-sm">
                  Follow curated learning paths for Fallout 4 modding. Whether you are just starting out or tackling advanced topics, roadmaps keep you on track.
                </p>
                {renderGuideImage('page-5-modding-roadmaps.png', 'Modding Roadmaps')}
              </div>
            ),
            data: {
              stepId: 'page-roadmap',
              route: '/journey-hub',
              narration: 'Modding Roadmaps give you curated step-by-step learning paths — from beginner basics to advanced topics — so you always know what to do next.'
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
                {renderGuideImage('page-39-live-synapse.png', 'Live voice')}
              </div>
            ),
            data: {
              stepId: 'page-live',
              route: '/runtime-hub',
              narration: 'Here is the Runtime Hub. Open Live Synapse to talk with your microphone and hear spoken responses, then use Desktop Bridge and Holodeck from the same hub.'
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
                {renderGuideImage('page-24-the-workshop.png', 'Workshop')}
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
                {renderGuideImage('page-25-the-auditor.png', 'Auditor')}
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
                {renderGuideImage('page-38-image-studio.png', 'Image suite')}
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
                {renderGuideImage('page-16-packaging-release.png', 'Packaging and release')}
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
                {renderGuideImage('page-9-knowledge-search.png', 'Learning hub')}
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
                <p className="text-slate-300 text-sm mb-3">
                  That is the core layout. You can revisit this tour any time from the sidebar.
                </p>
                <div className="rounded-md border border-amber-700/40 bg-amber-900/10 p-3 text-xs text-amber-200">
                  <strong>Disclaimer:</strong> Mossy is not affiliated with, endorsed by, or officially connected to any of the third-party tools or add-ons referenced in this app (xEdit, Mod Organizer 2, Vortex, LOOT, Spriggit, Blender, BodySlide, FOMOD Creator, NifSkope, or any other listed tool). All tool names, logos, and trademarks belong to their respective owners. Mossy simply helps you use them — always download tools directly from their official sources.
                </div>
              </div>
            ),
            data: {
              stepId: 'page-finish',
              route: '/',
              narration: 'That completes the welcome tour. You can replay it any time from the sidebar. Remember: Mossy is not affiliated with any of the third-party tools listed in this app — always download from official sources.'
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
