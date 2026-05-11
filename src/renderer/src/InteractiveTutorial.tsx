// Interactive Tutorial Mode: guides users through Mossy step-by-step after onboarding completes

import React, { useEffect, useRef, useState } from 'react';
import {
  ArrowRight,
  BrainCircuit,
  CheckCircle2,
  Code,
  FileSearch,
  FileText,
  FolderOpen,
  Home,
  ImagePlus,
  ListChecks,
  Map,
  MessageCircle,
  Mic,
  BookOpen,
  Package,
  Play,
  Search,
  Settings,
  Sparkles,
  Stethoscope,
  TestTube,
  Wand2,
  Workflow,
  Wrench,
  XCircle,
} from 'lucide-react';
import { tutorialContexts, type TutorialPageContext } from './tutorialContext';
import { imageMap } from './generatedImageMap';
import { speakMossy } from './mossyTts';

// Map a tutorial pageId to its visual guide image asset with alias fallbacks for legacy ids
const resolveImageUrl = (filename: string): string => {
  // In Vite/Electron, images in public/ are served from dist root in production
  // Use relative path with ./ to work with file:// protocol in packaged Electron app
  // In development, both absolute and relative paths work, but relative is safer
  return `./visual-guide-images/${filename}`;
};

const getImageForPage = (pageId: keyof typeof imageMap | string): string | undefined => {
  const alias: Record<string, keyof typeof imageMap> = {
    nexus: 'mossy-space',
    'live-voice': 'live-synapse',
    auditor: 'the-auditor',
    workshop: 'the-workshop',
    blueprint: 'the-blueprint',
    assembler: 'the-assembler',
    vault: 'the-vault',
    'learning-hub': 'quick-reference',
    'roadmap-panel': 'modding-roadmaps',
    'mining-dashboard': 'mining-and-analysis-hub',
    'mining-panel': 'mining-and-analysis-hub',
    'advanced-analysis-panel': 'mining-and-analysis-hub',
    'advanced-analysis': 'mining-and-analysis-hub',
    'image-suite': 'image-studio',
    packaging: 'packaging-release',
    diagnostics: 'diagnostic-tools',
    support: 'support-mossy',
    'fallout4-wiki': 'fallout-4-wiki',
    'pip-boy-mode': 'pip-boy-on-off',
    monitor: 'system-monitor',
    orchestrator: 'the-orchestrator',
    holodeck: 'the-holodeck',
    'project-hub': 'mod-projects',
    scribe: 'the-scribe',
    'blender-animation-guide': 'animation-guide',
    'quest-authoring-guide': 'quest-mod-authorizing',
    'animation-suite': 'animation-guide',
    'upscayl-extension': 'upscale-extension',
    // Pages without specific images - use generic fallbacks
    'load-order': 'the-workshop',
    'bodyslide-guide': 'tools',
    'sim-settlements-guide': 'tools',
    'paperscript-guide': 'tools',
    'formid-remapper': 'the-workshop',
  };

  // Explicit fallbacks for images that exist on disk but were omitted from the auto-generated map
  const missingImages: Record<string, string> = {
    'guided-tours': 'page-54-guided-tours.png',
  };

  const resolvedId = (imageMap as Record<string, string>)[pageId] ? (pageId as keyof typeof imageMap) : alias[pageId];
  const filename = resolvedId ? imageMap[resolvedId] : missingImages[pageId];
  return filename ? resolveImageUrl(filename) : undefined;
};

// Helper exported for unit tests: builds the textual tutorial content for a page context
export function buildTutorialText(context: TutorialPageContext, pageIndex: number, hasPreconfiguredApiKeys = false) {
  let detailedText = `This is ${context.pageName}. ${context.purpose}.`;

  if (context.features.length > 0) {
    const featureList = context.features.slice(0, 4).join(', ');
    detailedText += ` You'll find: ${featureList}.`;
  }

  if (context.controls.length > 0) {
    detailedText += ` Here are the main controls. `;
    context.controls.slice(0, 3).forEach((control) => {
      detailedText += `**${control.name}** — ${control.description}. ${control.whenToUse}. `;
    });
  }

  if (context.guides.length > 0 && context.guides[0].steps.length > 0) {
    detailedText += `Quick walkthrough: `;
    const guide = context.guides[0];
    guide.steps.slice(0, 3).forEach((step, idx) => {
      detailedText += `${idx + 1}. ${step}. `;
    });
  }

  if (context.commonMistakes.length > 0) {
    detailedText += `Heads up: ${context.commonMistakes[0]}. `;
  }

  if (hasPreconfiguredApiKeys) {
    detailedText = detailedText.replace(/[^.?!]*(?:API key|api key|OpenAI|openai|Groq|groq|api-key|api_key)[^.?!]*[.?!]?/gi, '');
    detailedText = detailedText.replace(/\s{2,}/g, ' ').replace(/^[.?!\s]+|[.?!\s]+$/g, '').trim();
  }

  detailedText += ` Take a look around, then hit Next Step when you're ready.`;
  return detailedText;
}

// Return tutorial contexts ordered to match VISUAL_GUIDE page numbers when available.
// Only includes contexts that are explicitly defined and marked as active.
export function getOrderedTutorialContexts(allContexts: Record<string, TutorialPageContext>) {
  // Get all defined contexts and filter to only ACTIVE pages (those with visualGuidePage set)
  const activeContexts = Object.values(allContexts)
    .filter((ctx) => ctx.visualGuidePage !== undefined && ctx.visualGuidePage !== null)
    .sort((a, b) => {
      const pageA = a.visualGuidePage ?? 999;
      const pageB = b.visualGuidePage ?? 999;
      if (pageA !== pageB) return pageA - pageB;
      return a.pageId.localeCompare(b.pageId);
    });

  return activeContexts;
}

interface InteractiveTutorialProps {
  onComplete: () => void;
  onSkip: () => void;
  /** Test-only override to force Pip‑Boy sizing in unit tests */
  testPipMode?: boolean;
}

interface TutorialStep {
  id: string;
  title: string;
  mossyText: string;
  route: string;
  action: string;
  completionCheck?: string;
  icon: React.ReactNode;
  image?: string;
}

export const InteractiveTutorial: React.FC<InteractiveTutorialProps> = ({ onComplete, onSkip, testPipMode }) => {
  const orderedContexts = getOrderedTutorialContexts(tutorialContexts);
  const totalPages = orderedContexts.length;
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<string[]>([]);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [hasPreconfiguredApiKeys, setHasPreconfiguredApiKeys] = useState(false);
  const lastSpokenStepId = useRef<string | null>(null);

  useEffect(() => {
    const detectPackagedKeys = async () => {
      try {
        const api = (window as any).electronAPI ?? (window as any).electron?.api;
        if (api?.getSecretStatus) {
          const st = await api.getSecretStatus();
          if (st && st.ok && (st.backendToken || st.openai || st.openaiApiKey || st.openaiKey)) {
            setHasPreconfiguredApiKeys(true);
            return;
          }
        }

        if (
          Boolean(process?.env?.REACT_APP_OPENAI_API_KEY) ||
          Boolean((import.meta as any).env?.VITE_OPENAI_API_KEY) ||
          Boolean(localStorage.getItem('openai_api_key')) ||
          Boolean(localStorage.getItem('mossy_backend_token'))
        ) {
          setHasPreconfiguredApiKeys(true);
        }
      } catch (err) {
        // non-fatal - leave default (false)
      }
    };

    void detectPackagedKeys();
  }, []);

  // Restore saved tutorial position (if present) so re-opening the tutorial preserves progress
  useEffect(() => {
    try {
      const saved = localStorage.getItem('mossy_tutorial_step');
      if (saved) {
        const idx = parseInt(saved, 10);
        if (!Number.isNaN(idx) && idx >= 0) setCurrentStepIndex(idx);
      }

      const completed = localStorage.getItem('mossy_tutorial_completed_steps');
      if (completed) {
        const arr = JSON.parse(completed);
        if (Array.isArray(arr)) setCompletedSteps(arr);
      }
    } catch (e) {
      // ignore - safe fallback
    }
  }, []);

  const steps: TutorialStep[] = [
    {
      id: 'welcome',
      title: 'Welcome to Mossy! Your Fallout 4 Modding Companion',
      mossyText:
        `Hey! I'm Mossy, your Fallout 4 modding companion. This tour covers ${totalPages} pages — each one is a different tool or module in the app. I'll walk you through what each page does, point out the key controls, and give you some tips — I will help make it easier for you to learn. You'll see actual screenshots alongside the explanations. The whole thing takes around 15–20 minutes, and you can pause or come back to it any time. Your progress is saved, so no pressure.\n\nA quick note before we start: **Mossy is not affiliated with, endorsed by, or officially connected to any third-party tools or add-ons** referenced in this app — including xEdit, Mod Organizer 2, Vortex, LOOT, Spriggit, Blender, BodySlide, NifSkope, or any other listed tool. Those are all independent, community-made software projects. Mossy simply helps you use them — always download tools directly from their official sources.\n\nReady? Let's start with The Nexus — your home dashboard.`,
      route: '/',
      action: 'Get familiar with The Nexus dashboard — your home base',
      icon: <Home className="w-8 h-8" />,
      image: getImageForPage('mossy-space'),
    },
    // Dynamically generate steps from tutorial contexts
    ...orderedContexts.map((context, index) => {
      const detailedText = buildTutorialText(context, index, hasPreconfiguredApiKeys);
      return {
        id: context.pageId,
        title: `${context.pageName} - Page ${typeof context.visualGuidePage === 'number' ? context.visualGuidePage : index + 2}`,
        mossyText: detailedText,
        route: context.route,
        action: `Explore ${context.pageName} and try the main features`,
        icon: getIconForPage(context.pageId),
        image: getImageForPage(context.pageId as keyof typeof imageMap),
      };
    }),
    {
      id: 'complete',
      title: "🎉 You're All Set!",
      mossyText:
        "That's the full tour — nice work making it through! You've seen every tool and module this app has to offer.\n\n**What's new since the last major release:**\n• **Spriggit Plugin Digest** — after first-run setup you can convert your .esp/.esm/.esl files to YAML and feed them directly into my brain so I know your exact plugin data from day one.\n• **Training Data Pipeline** — use the 👍 / 👎 buttons on any of my chat responses to build a personal training dataset that can be exported in Unsloth ShareGPT format.\n• **Background Scan Persistence** — the Asset Duplicator now keeps scanning even if you switch panels, and has an Install Recovery panel so no pending tool installs get lost.\n• **Knowledge Vault** is now dual-persisted: localStorage for speed plus a file backup in userData that survives reinstalls.\n• **Blender Token Auth** — the Mossy Link addon and Desktop Bridge now authenticate via auto-generated 32-char tokens so your Blender connection is secure.\n\nFrom here, I'd suggest starting with something simple like a texture swap to get your hands dirty. When you have questions, just open the Chat — I'm always here. The Learning Hub is great for going deeper on specific topics like scripting or quest design. And the Project Hub helps you stay organized as things get more complex.\n\nRemember: I'm not affiliated with any third-party tools — always get them from their official sources. Don't worry about remembering everything at once. Just dive in, experiment, and ask when you get stuck. That's how every good modder gets started. Happy modding!",
      route: '/',
      action: 'Start exploring — try the Chat or Learning Hub first!',
      icon: <CheckCircle2 className="w-8 h-8" />,
      image: getImageForPage('mossy-space'),
    },
  ];

  function getIconForPage(pageId: string) {
    const iconMap: Record<string, React.ReactNode> = {
      'nexus': <Home className="w-8 h-8" />,
      'ai-chat': <MessageCircle className="w-8 h-8" />,
      'ai-mod-assistant': <BrainCircuit className="w-8 h-8" />,
      'live-voice': <Mic className="w-8 h-8" />,
      'auditor': <FileSearch className="w-8 h-8" />,
      'image-suite': <ImagePlus className="w-8 h-8" />,
      'workshop': <Code className="w-8 h-8" />,
      'orchestrator': <Workflow className="w-8 h-8" />,
      'load-order': <ListChecks className="w-8 h-8" />,
      'holodeck': <TestTube className="w-8 h-8" />,
      'packaging': <Package className="w-8 h-8" />,
      'learning-hub': <BookOpen className="w-8 h-8" />,
      'settings': <Settings className="w-8 h-8" />,
      'project-hub': <FolderOpen className="w-8 h-8" />,
      'diagnostics': <Stethoscope className="w-8 h-8" />,
      'monitor': <Stethoscope className="w-8 h-8" />,
      'devtools': <Wrench className="w-8 h-8" />,
      'wizards': <Wand2 className="w-8 h-8" />,
      'knowledge-search': <Search className="w-8 h-8" />,
      'crash-triage': <Stethoscope className="w-8 h-8" />,
      'the-lorekeeper': <BookOpen className="w-8 h-8" />,
      'blueprint': <Map className="w-8 h-8" />,
      'assembler': <Wrench className="w-8 h-8" />,
      'scribe': <FileText className="w-8 h-8" />,
      'vault': <BrainCircuit className="w-8 h-8" />,
      'duplicate-finder': <Search className="w-8 h-8" />,
      'cosmos-workflow': <Workflow className="w-8 h-8" />,
      'workflow-runner': <Play className="w-8 h-8" />,
      'desktop-bridge': <Wrench className="w-8 h-8" />,
      'blender-animation-guide': <TestTube className="w-8 h-8" />,
      'quest-authoring-guide': <BookOpen className="w-8 h-8" />,
      'bodyslide-guide': <Settings className="w-8 h-8" />,
      'sim-settlements-guide': <Map className="w-8 h-8" />,
      'paperscript-guide': <Code className="w-8 h-8" />,
      'support': <Sparkles className="w-8 h-8" />,
      'mining-dashboard': <Search className="w-8 h-8" />,
      'advanced-analysis-panel': <FileSearch className="w-8 h-8" />,
      'plugin-manager': <Settings className="w-8 h-8" />,
      'roadmap-panel': <Map className="w-8 h-8" />,
      'ba2-manager': <Package className="w-8 h-8" />,
      'workflow-recorder': <Play className="w-8 h-8" />,
      'first-success': <CheckCircle2 className="w-8 h-8" />,
      'whats-new': <Sparkles className="w-8 h-8" />,
      'mining-panel': <Search className="w-8 h-8" />,
    };
    return iconMap[pageId] || <Sparkles className="w-8 h-8" />;
  }

  const currentStep = steps[currentStepIndex];
  const progress = ((currentStepIndex + 1) / steps.length) * 100;
  const stepImage = currentStep.image ?? (currentStep.id === 'welcome' ? getImageForPage('mossy-space') : undefined);

  const bodyHasPip = typeof document !== 'undefined' && document.body.classList.contains('pip-boy-mode');
  const localPipFlag = typeof window !== 'undefined' && localStorage.getItem('mossy_pip_mode') === 'true';
  const isPipBoyMode = typeof testPipMode === 'boolean' ? testPipMode : bodyHasPip || localPipFlag;

  const visualMaxClass = (() => {
    if (isPipBoyMode) {
      return ['ai-chat', 'project-hub'].includes(currentStep.id)
        ? 'max-h-[26vh]'
        : 'max-h-[34vh] md:max-h-[42vh]';
    }

    return ['ai-chat', 'project-hub'].includes(currentStep.id)
      ? 'max-h-[30vh]'
      : 'max-h-[44vh] md:max-h-[52vh]';
  })();

  useEffect(() => {
    localStorage.setItem('mossy_tutorial_step', currentStepIndex.toString());
    localStorage.setItem('mossy_tutorial_completed_steps', JSON.stringify(completedSteps));
  }, [currentStepIndex, completedSteps]);

  const shouldSpeak = () => {
    try {
      return localStorage.getItem('mossy_voice_enabled') !== 'false';
    } catch {
      return true;
    }
  };

  const normalizeForSpeech = (text: string) => text.replace(/\*\*/g, '').replace(/•/g, '').replace(/\s+/g, ' ').trim();

  useEffect(() => {
    if (!shouldSpeak()) return;
    if (lastSpokenStepId.current === currentStep.id) return;
    lastSpokenStepId.current = currentStep.id;
    const speech = normalizeForSpeech(currentStep.mossyText);
    if (speech) {
      void speakMossy(speech, { cancelExisting: true });
    }
  }, [currentStep.id, currentStep.mossyText]);

  const handleNext = () => {
    if (currentStepIndex < steps.length - 1) {
      if (!completedSteps.includes(currentStep.id)) {
        setCompletedSteps([...completedSteps, currentStep.id]);
      }

      setIsTransitioning(true);
      setTimeout(() => {
        setCurrentStepIndex(currentStepIndex + 1);
        setIsTransitioning(false);
      }, 300);
    } else {
      handleComplete();
    }
  };

  const handlePrevious = () => {
    if (currentStepIndex > 0) {
      setIsTransitioning(true);
      setTimeout(() => {
        setCurrentStepIndex(currentStepIndex - 1);
        setIsTransitioning(false);
      }, 300);
    }
  };

  const handleComplete = () => {
    localStorage.setItem('mossy_tutorial_completed', 'true');
    localStorage.setItem('mossy_tutorial_completion_date', new Date().toISOString());
    onComplete();
  };

  const handleSkipTutorial = () => {
    if (confirm('Are you sure you want to exit the tutorial? You can always access it later from the guide menu.')) {
      localStorage.setItem('mossy_tutorial_skipped', 'true');
      localStorage.removeItem('mossy_tutorial_step');
      localStorage.removeItem('mossy_tutorial_completed_steps');
      onSkip();
    }
  };

  const renderInline = (text: string) => {
    const parts = text.split('**');
    return parts.map((part, index) =>
      index % 2 === 1 ? (
        <strong key={`bold-${index}`} className="text-white">
          {part}
        </strong>
      ) : (
        <span key={`text-${index}`}>{part}</span>
      )
    );
  };

  const renderMossyText = (text: string) => {
    const lines = text.split('\n');
    const blocks: React.ReactNode[] = [];
    let listItems: string[] = [];

    const flushList = () => {
      if (listItems.length === 0) return;
      blocks.push(
        <ul key={`list-${blocks.length}`} className="list-disc pl-6 space-y-1 text-slate-200">
          {listItems.map((item, index) => (
            <li key={`item-${index}`}>{renderInline(item)}</li>
          ))}
        </ul>
      );
      listItems = [];
    };

    lines.forEach((line) => {
      const trimmed = line.trim();
      if (!trimmed) {
        flushList();
        return;
      }

      if (trimmed.startsWith('•')) {
        listItems.push(trimmed.replace(/^•\s*/, ''));
        return;
      }

      flushList();
      blocks.push(
        <p key={`p-${blocks.length}`} className="text-slate-200 leading-relaxed">
          {renderInline(trimmed)}
        </p>
      );
    });

    flushList();
    return blocks;
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100" data-tutorial-active="true">
      <div className="flex flex-col min-h-screen">
        <div className="border-b border-emerald-500/40 bg-slate-950/80">
          <div className="max-w-6xl mx-auto px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-emerald-500/20 rounded-full flex items-center justify-center border-2 border-emerald-500/40">
                  {currentStep.icon}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <BrainCircuit className="w-4 h-4 text-emerald-400" />
                    <span className="text-xs text-emerald-400 font-bold uppercase tracking-wider">Mossy Tutorial</span>
                    <span className="text-xs text-slate-400">Step {currentStepIndex + 1} of {steps.length}</span>
                    <span className="text-xs text-slate-500">{Math.max(steps.length - currentStepIndex - 1, 0)} left</span>
                  </div>
                  <h2 className="text-2xl font-bold text-white">{currentStep.title}</h2>
                </div>
              </div>

              <button onClick={handleSkipTutorial} className="text-slate-400 hover:text-slate-200 text-sm flex items-center gap-1 transition-colors">
                <XCircle className="w-4 h-4" />
                Exit Tutorial
              </button>
            </div>
          </div>
          <div className="h-1 bg-slate-800">
            <div className="h-full bg-gradient-to-r from-emerald-500 to-blue-500 transition-all duration-500" style={{ width: `${progress}%` }} />
          </div>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto">
          <div className="px-6 py-6 pb-36">
            <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className={`bg-slate-900/60 border border-slate-700 rounded-2xl p-6 space-y-4 transition-opacity duration-300 ${isTransitioning ? 'opacity-0' : 'opacity-100'}`}>
                <div className="text-sm font-semibold text-emerald-300 uppercase tracking-wider">Mossy Says</div>
                <div className="space-y-3 text-base">{renderMossyText(currentStep.mossyText)}</div>

                <div className="bg-blue-900/20 border border-blue-500/30 rounded-xl p-4">
                  <div className="flex items-center gap-3">
                    <Play className="w-5 h-5 text-blue-400" />
                    <div>
                      <div className="text-xs text-blue-400 font-medium mb-1">YOUR TURN</div>
                      <div className="text-white font-medium">{currentStep.action}</div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-slate-900/60 border border-slate-700 rounded-2xl p-6 flex flex-col">
                <div className="text-sm font-semibold text-emerald-300 uppercase tracking-wider mb-4">Visual Guide</div>
                {stepImage ? (
                  <div className="flex-1 flex flex-col min-h-0">
                    <div
                      data-prop-test-pip={typeof testPipMode === 'boolean' ? String(testPipMode) : 'unset'}
                      data-pip-mode={isPipBoyMode ? 'true' : 'false'}
                      data-body-pip={bodyHasPip ? 'true' : 'false'}
                      data-local-pip={localPipFlag ? 'true' : 'false'}
                      className={`bg-slate-950/60 border border-slate-700 rounded-xl p-4 flex-1 overflow-auto ${visualMaxClass}`}
                    >
                      <img
                        src={stepImage}
                        alt={`${currentStep.title} screenshot`}
                        className="w-full h-auto max-h-full rounded border border-slate-600 object-contain"
                        loading="lazy"
                      />
                    </div>
                    <p className="text-xs text-slate-400 text-center mt-3">Screenshot of {currentStep.title.replace(' - Page ' + (currentStepIndex + 1), '')}</p>
                  </div>
                ) : (
                  <div className="flex-1 flex items-center justify-center text-slate-400 text-sm border border-dashed border-slate-700 rounded-xl">
                    No screenshot available for this step.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="border-t border-slate-800 bg-slate-950/95 backdrop-blur-sm sticky bottom-0 z-10">
          <div className="max-w-6xl mx-auto px-6 py-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-2">
                {steps.map((step, index) => (
                  <div
                    key={step.id}
                    className={`w-2.5 h-2.5 rounded-full transition-colors ${
                      index < currentStepIndex ? 'bg-emerald-500' : index === currentStepIndex ? 'bg-blue-500' : 'bg-slate-700'
                    }`}
                    title={step.title}
                  />
                ))}
              </div>

              <div className="flex gap-3">
                {currentStepIndex > 0 && (
                  <button onClick={handlePrevious} className="px-6 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-medium transition-colors">
                    Previous
                  </button>
                )}

                <button
                  onClick={handleNext}
                  className="px-6 py-2 bg-gradient-to-r from-emerald-500 to-blue-500 hover:from-emerald-600 hover:to-blue-600 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
                >
                  {currentStepIndex === steps.length - 1 ? 'Finish Tutorial' : 'Next Step'}
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="mt-3 text-center text-xs text-slate-500">💡 Tip: You can always access this tutorial again from Settings → Help</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InteractiveTutorial;
