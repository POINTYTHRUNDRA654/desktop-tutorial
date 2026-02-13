/**
 * Interactive Tutorial Mode
 * 
 * Guides users through Mossy step-by-step after onboarding completes
 * Mossy actively explains features and has users try them
 */

import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  BrainCircuit, 
  MessageCircle, 
  Mic, 
  Search, 
  FileSearch, 
  ImagePlus,
  CheckCircle2,
  ArrowRight,
  Home,
  Sparkles,
  Play,
  XCircle,
  Code,
  Workflow,
  ListChecks,
  TestTube,
  Package,
  BookOpen,
  Settings,
  FolderOpen,
  Stethoscope,
  Wrench,
  Wand2,
  Map,
  FileText
} from 'lucide-react';
import { tutorialContexts } from './tutorialContext';
import { speakMossy } from './mossyTts';

interface InteractiveTutorialProps {
  onComplete: () => void;
  onSkip: () => void;
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

export const InteractiveTutorial: React.FC<InteractiveTutorialProps> = ({ 
  onComplete, 
  onSkip 
}) => {
  const navigate = useNavigate();
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<string[]>([]);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const lastSpokenStepId = useRef<string | null>(null);

  const steps: TutorialStep[] = [
    {
      id: 'welcome',
      title: 'Welcome to Mossy! Your Complete Fallout 4 Modding Guide',
      mossyText: `Hello! I'm Mossy, your artificial intelligence assistant for Fallout 4 modding. I'm here to guide you through every feature of this application. This comprehensive tutorial covers 40 different pages, each dedicated to a specific tool or module. For each page, I will explain what the tool is designed for, describe every button and control, and show you exactly how to use it step by step. You'll see actual screenshots of each page, along with beginner tips to help you avoid common mistakes. The complete tutorial takes approximately 15 to 20 minutes. You can pause at any time by clicking the Exit Tutorial button, and your progress will be saved. You can also use the Previous Step button to review any page. Ready to begin? Let's start with The Nexus, your main dashboard. Click the Next Step button when you're ready to proceed.`,
      route: '/',
      action: 'Get familiar with The Nexus dashboard - this is your home base',
      icon: <Home className="w-8 h-8" />,
    },
    // Dynamically generate steps from tutorial contexts
    ...Object.values(tutorialContexts).map((context, index) => {
      // Build detailed professional tutorial text
      let detailedText = `Welcome to ${context.pageName}. ${context.purpose}.`;
      
      // Add key features
      if (context.features.length > 0) {
        const featureList = context.features.slice(0, 4).join(', ');
        detailedText += ` Key features include: ${featureList}.`;
      }
      
      // Explain buttons and controls in detail
      if (context.controls.length > 0) {
        detailedText += ` Let me explain the main buttons and controls. `;
        context.controls.slice(0, 3).forEach((control) => {
          detailedText += `The ${control.name} ${control.description}. Use this ${control.whenToUse}. `;
        });
      }
      
      // Add step-by-step guide
      if (context.guides.length > 0 && context.guides[0].steps.length > 0) {
        detailedText += `Here's how to use this page: `;
        const guide = context.guides[0];
        guide.steps.slice(0, 3).forEach((step, idx) => {
          detailedText += `Step ${idx + 1}, ${step}. `;
        });
      }
      
      // Add beginner tip
      if (context.commonMistakes.length > 0) {
        detailedText += `Important beginner tip: ${context.commonMistakes[0]}. `;
      }
      
      detailedText += `Take your time to explore this page. When you're ready, click Next Step to continue.`;
      
      return {
        id: context.pageId,
        title: `${context.pageName} - Page ${index + 2}`,
        mossyText: detailedText,
        route: context.route,
        action: `Explore ${context.pageName} and try the main features`,
        icon: getIconForPage(context.pageId),
        image: getImageForPage(context.pageId),
      };
    }),
    {
      id: 'complete',
      title: '🎉 Tutorial Complete! You\'re Ready to Start Modding!',
      mossyText: `Congratulations! You have successfully completed the entire tutorial. You've now been introduced to all 40 pages of tools and features available in this application. You understand what each module does, how to use the buttons and controls, and have seen step-by-step guides for common tasks. You are now ready to begin your modding journey. Here are your next steps. First, I recommend starting with a simple texture modification to get comfortable with the workflow. Second, use the Chat module whenever you have questions - I'm here 24/7 to assist you. Third, visit the Learning Hub for in-depth guides on specific topics like scripting, animation, and quest design. Fourth, explore the Project Hub to organize your work and track your progress. Remember, every expert modder was once a beginner just like you. Don't be intimidated by the tools - take your time and experiment. If you encounter any problems or get stuck, simply click the chat icon in the navigation bar and ask me for help. I'm always here to guide you. Now go create something amazing! Happy modding!`,
      route: '/',
      action: 'Start exploring on your own - try the Chat or Learning Hub!',
      icon: <CheckCircle2 className="w-8 h-8" />,
    },
  ];

  // Helper function to get appropriate icon for each page
  function getIconForPage(pageId: string) {
    const iconMap: Record<string, React.ReactNode> = {
      'nexus': <Home className="w-8 h-8" />,
      'chat': <MessageCircle className="w-8 h-8" />,
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
      'devtools': <Wrench className="w-8 h-8" />,
      'wizards': <Wand2 className="w-8 h-8" />,
      'blueprint': <Map className="w-8 h-8" />,
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

  // Helper function to get appropriate image for each page
  function getImageForPage(pageId: string): string | undefined {
    const imageMap: Record<string, string> = {
      'nexus': '/visual-guide-images/Page one. Mossy\'s space..png',
      'chat': '/visual-guide-images/Page two. AI Chat..png',
      'live-voice': '/visual-guide-images/Page 35 Live Synapse..png',
      'auditor': '/visual-guide-images/Page 21 the auditor..png',
      'image-suite': '/visual-guide-images/Page 34 image Studio..png',
      'workshop': '/visual-guide-images/Page 19, the workshop..png',
      'orchestrator': '/visual-guide-images/Page 26 the Orchestrator..png',
      'load-order': '/visual-guide-images/Page 25 System Monitor..png',
      'holodeck': '/visual-guide-images/Page 28. The holodeck..png',
      'packaging': '/visual-guide-images/Page 11. Packaging and release..png',
      'learning-hub': '/visual-guide-images/Page 7. Quick reference.png',
      'settings': '/visual-guide-images/Page 40 settings..png',
      'project-hub': '/visual-guide-images/Page 6 mod projects..png',
      'diagnostics': '/visual-guide-images/Page 41 Diagnostic Tools..png',
      'devtools': '/visual-guide-images/Page 17 dev tools..png',
      'wizards': '/visual-guide-images/Page 9 wizards..png',
      'blueprint': '/visual-guide-images/Page 20 the blueprint..png',
      'scribe': '/visual-guide-images/Page 24 The Scribe..png',
      'vault': '/visual-guide-images/Page 29 the Vault..png',
      'duplicate-finder': '/visual-guide-images/Page 37. Duplicate. Finder..png',
      'cosmos-workflow': '/visual-guide-images/Page 16 Cosmos Workflow..png',
      'workflow-runner': '/visual-guide-images/Page 27 workflow runner..png',
      'desktop-bridge': '/visual-guide-images/Page 36, Desktop Bridge..png',
      'blender-animation-guide': '/visual-guide-images/Page 12 Animation Guide..png',
      'quest-authoring-guide': '/visual-guide-images/Page 13. Quest mod authorizing. .png',
      'bodyslide-guide': '/visual-guide-images/Page 7. Quick reference.png', // Using general guide image
      'sim-settlements-guide': '/visual-guide-images/Page 7. Quick reference.png', // Using general guide image
      'paperscript-guide': '/visual-guide-images/Page 7. Quick reference.png', // Using general guide image
      'support': '/visual-guide-images/Page 42 support Mossy..png',
      'mining-dashboard': '/visual-guide-images/Page 7. Quick reference.png', // Using general guide image
      'advanced-analysis-panel': '/visual-guide-images/Page 21 the auditor..png', // Similar to auditor
      'plugin-manager': '/visual-guide-images/Page 17 dev tools..png', // Similar to dev tools
      'roadmap-panel': '/visual-guide-images/Page 7. Quick reference.png', // Using general guide image
      'ba2-manager': '/visual-guide-images/Page 11. Packaging and release..png', // Similar to packaging
      'workflow-recorder': '/visual-guide-images/Page 26 the Orchestrator..png', // Similar to orchestrator
      'first-success': '/visual-guide-images/Page 7. Quick reference.png', // Using general guide image
      'whats-new': '/visual-guide-images/Page 7. Quick reference.png', // Using general guide image
      'mining-panel': '/visual-guide-images/Page 7. Quick reference.png', // Using general guide image
    };
    return imageMap[pageId];
  }

  const currentStep = steps[currentStepIndex];
  const progress = ((currentStepIndex + 1) / steps.length) * 100;
  const stepImage = currentStep.image ?? (currentStep.id === 'welcome' ? getImageForPage('nexus') : undefined);

  useEffect(() => {
    // Save progress
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

  const normalizeForSpeech = (text: string) =>
    text
      .replace(/\*\*/g, '')
      .replace(/•/g, '')
      .replace(/\s+/g, ' ')
      .trim();

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
      // Mark current step as completed
      if (!completedSteps.includes(currentStep.id)) {
        setCompletedSteps([...completedSteps, currentStep.id]);
      }

      setIsTransitioning(true);

      setTimeout(() => {
        setCurrentStepIndex(currentStepIndex + 1);
        setIsTransitioning(false);
      }, 300);
    } else {
      // Tutorial complete!
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
    <div className="min-h-full bg-slate-950 text-slate-100" data-tutorial-active="true">
      <div className="flex h-full flex-col">
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
                    <span className="text-xs text-slate-400">
                      Step {currentStepIndex + 1} of {steps.length}
                    </span>
                    <span className="text-xs text-slate-500">
                      {Math.max(steps.length - currentStepIndex - 1, 0)} left
                    </span>
                  </div>
                  <h2 className="text-2xl font-bold text-white">
                    {currentStep.title}
                  </h2>
                </div>
              </div>

              <button
                onClick={handleSkipTutorial}
                className="text-slate-400 hover:text-slate-200 text-sm flex items-center gap-1 transition-colors"
              >
                <XCircle className="w-4 h-4" />
                Exit Tutorial
              </button>
            </div>
          </div>
          <div className="h-1 bg-slate-800">
            <div
              className="h-full bg-gradient-to-r from-emerald-500 to-blue-500 transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        <div className="flex-1 overflow-hidden">
          <div className="h-full overflow-y-auto px-6 py-6">
            <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div
                className={`bg-slate-900/60 border border-slate-700 rounded-2xl p-6 space-y-4 transition-opacity duration-300 ${
                  isTransitioning ? 'opacity-0' : 'opacity-100'
                }`}
              >
                <div className="text-sm font-semibold text-emerald-300 uppercase tracking-wider">
                  Mossy Says
                </div>
                <div className="space-y-3 text-base">
                  {renderMossyText(currentStep.mossyText)}
                </div>

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
                <div className="text-sm font-semibold text-emerald-300 uppercase tracking-wider mb-4">
                  Visual Guide
                </div>
                {stepImage ? (
                  <div className="flex-1 flex flex-col">
                    <div className="bg-slate-950/60 border border-slate-700 rounded-xl p-4 flex-1">
                      <img
                        src={stepImage}
                        alt={`${currentStep.title} screenshot`}
                        className="w-full h-auto rounded border border-slate-600"
                        loading="lazy"
                      />
                    </div>
                    <p className="text-xs text-slate-400 text-center mt-3">
                      Screenshot of {currentStep.title.replace(' - Page ' + (currentStepIndex + 1), '')}
                    </p>
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

        <div className="border-t border-slate-800 bg-slate-950/80">
          <div className="max-w-6xl mx-auto px-6 py-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-2">
                {steps.map((step, index) => (
                  <div
                    key={step.id}
                    className={`w-2.5 h-2.5 rounded-full transition-colors ${
                      index < currentStepIndex
                        ? 'bg-emerald-500'
                        : index === currentStepIndex
                        ? 'bg-blue-500'
                        : 'bg-slate-700'
                    }`}
                    title={step.title}
                  />
                ))}
              </div>

              <div className="flex gap-3">
                {currentStepIndex > 0 && (
                  <button
                    onClick={handlePrevious}
                    className="px-6 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-medium transition-colors"
                  >
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

            <div className="mt-3 text-center text-xs text-slate-500">
              💡 Tip: You can always access this tutorial again from Settings → Help
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InteractiveTutorial;
