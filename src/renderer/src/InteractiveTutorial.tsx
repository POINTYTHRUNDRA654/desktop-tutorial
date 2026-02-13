/**
 * Interactive Tutorial Mode
 * 
 * Guides users through Mossy step-by-step after onboarding completes
 * Mossy actively explains features and has users try them
 */

import React, { useState, useEffect } from 'react';
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
  XCircle
} from 'lucide-react';

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
}

export const InteractiveTutorial: React.FC<InteractiveTutorialProps> = ({ 
  onComplete, 
  onSkip 
}) => {
  const navigate = useNavigate();
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<string[]>([]);
  const [isTransitioning, setIsTransitioning] = useState(false);

  const steps: TutorialStep[] = [
    {
      id: 'welcome',
      title: 'Welcome to Mossy!',
      mossyText: "Hi there! I'm Mossy, your AI-powered Fallout 4 modding assistant. I'm so excited to help you create amazing mods! Let me show you around. This will only take a few minutes, and I promise to make it fun! Ready? Let's start with The Nexus - your home base.",
      route: '/',
      action: 'Look around The Nexus dashboard',
      icon: <Home className="w-8 h-8" />,
    },
    {
      id: 'nexus',
      title: 'The Nexus - Your Home Base',
      mossyText: "This is The Nexus - think of it as mission control! See all those colorful cards? Each one is a different tool to help you mod. At the top, you'll see the Neural Link status - it shows which modding tools you have running. Pretty cool, right? When you're ready, let's check out how to talk to me!",
      route: '/',
      action: 'Explore the module cards',
      icon: <Sparkles className="w-8 h-8" />,
    },
    {
      id: 'chat',
      title: 'Chat with Me!',
      mossyText: "Okay, this is my favorite part - the Chat Interface! This is where we can have conversations. You can ask me anything about modding: 'How do I create a weapon?', 'What's a FormID?', 'Help me debug this error'. I'll answer in detail and remember our conversation. Go ahead, try asking me something!",
      route: '/chat',
      action: 'Type a message to Mossy',
      icon: <MessageCircle className="w-8 h-8" />,
    },
    {
      id: 'voice',
      title: 'Voice Chat (Optional)',
      mossyText: "Want to talk to me with your voice instead of typing? That's what Live Voice Chat is for! Just click the microphone button and speak naturally. I'll listen and respond out loud. It's super handy when you're working with both hands. We can skip this for now if you want to try it later!",
      route: '/live',
      action: 'See the voice interface',
      icon: <Mic className="w-8 h-8" />,
    },
    {
      id: 'auditor',
      title: 'The Auditor - Check Your Files',
      mossyText: "The Auditor is like a super smart file checker! Upload your ESP, NIF, or DDS files here, and I'll scan them for problems. Things like: 'Is this texture the right size?', 'Does this mesh have too many polygons?', 'Are there any broken paths?' I'll find issues BEFORE you test in-game. Saves hours of troubleshooting!",
      route: '/tools/auditor',
      action: 'See how The Auditor works',
      icon: <FileSearch className="w-8 h-8" />,
    },
    {
      id: 'image-suite',
      title: 'Image Suite - Create Textures',
      mossyText: "Last stop - the Image Suite! This is where you can create PBR textures. Upload a diffuse texture, and I can generate normal maps, roughness maps, height maps - all the fancy texture stuff! You can also convert images to DDS format. It's like having a texture artist assistant!",
      route: '/media/images',
      action: 'Explore texture generation',
      icon: <ImagePlus className="w-8 h-8" />,
    },
    {
      id: 'complete',
      title: 'Tutorial Complete!',
      mossyText: "You did it! 🎉 You now know the basics of Mossy. Remember: I'm always here to help! Just click the chat icon, or look for the help button on any page. If you ever get stuck, just ask me - there are no dumb questions! Now go create something amazing!",
      route: '/',
      action: 'Start modding!',
      icon: <CheckCircle2 className="w-8 h-8" />,
    },
  ];

  const currentStep = steps[currentStepIndex];
  const progress = ((currentStepIndex + 1) / steps.length) * 100;

  useEffect(() => {
    // Save progress
    localStorage.setItem('mossy_tutorial_step', currentStepIndex.toString());
    localStorage.setItem('mossy_tutorial_completed_steps', JSON.stringify(completedSteps));
  }, [currentStepIndex, completedSteps]);

  const handleNext = () => {
    if (currentStepIndex < steps.length - 1) {
      // Mark current step as completed
      if (!completedSteps.includes(currentStep.id)) {
        setCompletedSteps([...completedSteps, currentStep.id]);
      }

      setIsTransitioning(true);
      
      // Navigate to next step's route
      const nextStep = steps[currentStepIndex + 1];
      navigate(nextStep.route);
      
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
      const prevStep = steps[currentStepIndex - 1];
      navigate(prevStep.route);
      
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
    if (confirm('Are you sure you want to skip the tutorial? You can always access it later from the help menu.')) {
      localStorage.setItem('mossy_tutorial_skipped', 'true');
      onSkip();
    }
  };

  return (
    <>
      {/* Tutorial Overlay */}
      <div className="fixed inset-0 bg-black/80 z-[100] pointer-events-none" />
      
      {/* Tutorial Panel */}
      <div className="fixed bottom-0 left-0 right-0 z-[101] bg-gradient-to-t from-slate-900 via-slate-900 to-slate-900/95 border-t-4 border-emerald-500 shadow-2xl">
        {/* Progress Bar */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-slate-800">
          <div 
            className="h-full bg-gradient-to-r from-emerald-500 to-blue-500 transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>

        <div className="max-w-5xl mx-auto px-6 py-6">
          {/* Header */}
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-emerald-500/20 rounded-full flex items-center justify-center border-2 border-emerald-500/40">
                {currentStep.icon}
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <BrainCircuit className="w-4 h-4 text-emerald-400" />
                  <span className="text-xs text-emerald-400 font-bold uppercase tracking-wider">
                    Mossy Says
                  </span>
                  <span className="text-xs text-slate-500">
                    Step {currentStepIndex + 1} of {steps.length}
                  </span>
                </div>
                <h2 className="text-2xl font-bold text-white">
                  {currentStep.title}
                </h2>
              </div>
            </div>

            <button
              onClick={handleSkipTutorial}
              className="text-slate-400 hover:text-slate-300 text-sm flex items-center gap-1 transition-colors"
            >
              <XCircle className="w-4 h-4" />
              Skip Tutorial
            </button>
          </div>

          {/* Mossy's Guidance */}
          <div 
            className={`bg-slate-800/50 border border-slate-700 rounded-lg p-6 mb-6 transition-opacity duration-300 ${
              isTransitioning ? 'opacity-0' : 'opacity-100'
            }`}
          >
            <p className="text-slate-200 text-lg leading-relaxed">
              {currentStep.mossyText}
            </p>
          </div>

          {/* Action Prompt */}
          <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-4 mb-6">
            <div className="flex items-center gap-3">
              <Play className="w-5 h-5 text-blue-400" />
              <div>
                <div className="text-xs text-blue-400 font-medium mb-1">YOUR TURN:</div>
                <div className="text-white font-medium">{currentStep.action}</div>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <div className="flex items-center justify-between">
            <div className="flex gap-2">
              {steps.map((step, index) => (
                <div
                  key={step.id}
                  className={`w-2 h-2 rounded-full transition-colors ${
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

          {/* Help Text */}
          <div className="mt-4 text-center text-xs text-slate-500">
            💡 Tip: You can always access this tutorial again from Settings → Help
          </div>
        </div>
      </div>
    </>
  );
};

export default InteractiveTutorial;
