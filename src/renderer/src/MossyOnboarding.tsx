
interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  content: React.ReactNode;
}

interface PrivacySettings {
  keepLocalOnly: boolean;
  shareModProjectData: boolean;
  shareScriptPatterns: boolean;
  shareMeshOptimizations: boolean;
  shareBugReports: boolean;
  contributeToKnowledgeBase: boolean;
  allowAnalytics: boolean;
}

interface MossyOnboardingProps {
  onComplete?: () => void;
}

/* eslint-disable react/prop-types */
const MossyOnboarding: React.FC<MossyOnboardingProps> = ({ onComplete = () => {} }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [privacySettings, setPrivacySettings] = useState<PrivacySettings>({
    keepLocalOnly: true,
    shareModProjectData: false,
    shareScriptPatterns: false,
    shareMeshOptimizations: false,
    shareBugReports: false,
    contributeToKnowledgeBase: false,
    allowAnalytics: false,
  });

  const steps: OnboardingStep[] = [
    {
      id: 'nexus',
      title: 'The Nexus',
      icon: React.createElement(Shield, { className: "w-12 h-12 text-emerald-400" }),
      description: 'Onboarding, training, and neural calibration',
      content: (
        <div className="space-y-6">
          <p className="text-slate-400">
            The Nexus is your command center. It handles onboarding, system calibration, and connects Mossy to your local modding environment.
          </p>
          <ul className="list-disc pl-6 text-slate-300 text-sm space-y-1">
            <li>Step-by-step calibration and system hardware scanning</li>
            <li>Permission-based implementation protocol (Mossy always asks first)</li>
            <li>Neural Link activation for real-time tool monitoring</li>
            <li>Memory Vault ingestion for custom project knowledge</li>
          </ul>
        </div>
      )
    },
    {
      id: 'neural-link',
      title: 'Neural Link',
      description: 'Active process monitoring and tool alignment',
      icon: React.createElement(Zap, { className: "w-12 h-12 text-yellow-400" }),
      content: (
        <div className="space-y-6">
          <p className="text-slate-400">
            Mossy now integrates directly with your desktop. The Neural Link monitors programs like Blender, xEdit, and the Creation Kit to provide real-time advice and fix scripts.
          </p>
          <ul className="list-disc pl-6 text-slate-300 text-sm space-y-1">
            <li>Real-time detection of modding tools</li>
            <li>Automatic alignment scripts (1.0 Scale / 30 FPS fixes)</li>
            <li>Session-aware assistance based on your active window</li>
          </ul>
        </div>
      )
    },
    {
      id: 'memory-vault',
      title: 'Memory Vault',
      description: 'Ingest custom knowledge and private documentation',
      icon: React.createElement(BrainCircuit, { className: "w-12 h-12 text-blue-400" }),
      content: (
        <div className="space-y-6">
          <p className="text-slate-400">
            Train Mossy on your specific project notes and tutorials. The Memory Vault uses RAG (Retrieval-Augmented Generation) to give Mossy access to your private data.
          </p>
          <ul className="list-disc pl-6 text-slate-300 text-sm space-y-1">
            <li>Upload custom .txt and .md tutorials</li>
            <li>Neural digestion for instant knowledge integration</li>
            <li>100% local and private context processing</li>
          </ul>
        </div>
      )
    },
    {
      id: 'organizer',
      title: 'The Organizer',
      description: 'Mod management, AI load order, and conflict resolution',
      icon: React.createElement(Layers, { className: "w-12 h-12 text-blue-400" }),
      content: (
        <div className="space-y-6">
          <p className="text-slate-400">
            The Organizer is your mod management hub. Enable, disable, and prioritize mods, visualize conflicts, and use AI-powered sorting for optimal load order. Quest mods and utilities are fully supported.
          </p>
          <ul className="list-disc pl-6 text-slate-300 text-sm space-y-1">
            <li>Enable/disable mods and manage categories</li>
            <li>Visualize conflicts and load order</li>
            <li>AI-powered LOOT-style sorting and quest mod support</li>
            <li>Tool dashboard for utility detection and management</li>
          </ul>
        </div>
      )
    },
    {
      id: 'assembler',
      title: 'The Assembler',
      description: 'FOMOD packaging, automation, and preview',
      icon: React.createElement(Package, { className: "w-12 h-12 text-purple-400" }),
      content: (
        <div className="space-y-6">
          <p className="text-slate-400">
            The Assembler lets you visually build FOMOD installers, auto-generate structure from your files, and export ready-to-use XML. Preview your installer and launch external tools for advanced packaging.
          </p>
          <ul className="list-disc pl-6 text-slate-300 text-sm space-y-1">
            <li>Visual FOMOD structure editor (pages, groups, options)</li>
            <li>AI-powered auto-generation from mod files</li>
            <li>Live preview and XML export</li>
            <li>External tool integration for advanced workflows</li>
          </ul>
        </div>
      )
    },
    {
      id: 'auditor',
      title: 'The Auditor',
      description: 'Advanced QA, asset integrity, and auto-fix',
      icon: React.createElement(Shield, { className: "w-12 h-12 text-red-400" }),
      content: (
        <div className="space-y-6">
          <p className="text-slate-400">
            The Auditor scans your plugins, meshes, textures, and materials for errors, warnings, and optimization issues. Get AI-powered explanations, manual fix guidance, and one-click auto-fix for common problems.
          </p>
          <ul className="list-disc pl-6 text-slate-300 text-sm space-y-1">
            <li>Upload and scan ESP, NIF, DDS, and BGSM files</li>
            <li>Automated audit with severity and actionable fixes</li>
            <li>AI explanations and manual fix strategies</li>
            <li>Integration with xEdit, NifSkope, and more</li>
          </ul>
        </div>
      )
    },
    {
      id: 'privacy',
      title: 'Privacy & Pro Tips',
      description: 'Control your data and unlock expert workflows',
      icon: React.createElement(Settings, { className: "w-12 h-12 text-emerald-400" }),
      content: (
        <div className="space-y-6">
          <p className="text-slate-400">
            Mossy puts you in control of your data. All advanced features are local-first, with privacy settings for sharing only what you choose. Unlock pro tips and shortcuts as you complete onboarding and training.
          </p>
          <ul className="list-disc pl-6 text-slate-300 text-sm space-y-1">
            <li>All data is local by default—share only what you want</li>
            <li>Change privacy and analytics settings anytime</li>
            <li>Unlock advanced tips and shortcuts as you progress</li>
          </ul>
        </div>
      )
    },
    {
      id: 'ready',
      title: "You're All Set!",
      description: 'Ready to start advanced modding',
      icon: React.createElement(CheckCircle2, { className: "w-12 h-12 text-emerald-400" }),
      content: (
        <div className="space-y-6">
          <div className="bg-emerald-900/20 border border-emerald-400/30 rounded-lg p-6">
            <h3 className="font-bold text-emerald-200 mb-4">Your Mossy Setup is Ready!</h3>
            <div className="space-y-3 text-slate-300 text-sm">
              <div className="flex gap-3">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                <span>All modules are unlocked and ready</span>
              </div>
              <div className="flex gap-3">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                <span>System integration and privacy configured</span>
              </div>
              <div className="flex gap-3">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                <span>Ready to start your first advanced project!</span>
              </div>
              <div className="flex gap-3">
                <Shield className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                <span>Permission-first protocol active: Mossy will always ask before syncing or modifying files.</span>
              </div>
            </div>
          </div>

          <div className="bg-blue-900/20 border border-blue-400/30 rounded-lg p-6">
            <h3 className="font-bold text-blue-200 mb-3 flex items-center gap-2">
              <BookOpen className="w-4 h-4" /> Next Steps
            </h3>
            <ol className="space-y-2 text-slate-300 text-sm list-decimal list-inside">
              <li>Open any module from the sidebar to get started</li>
              <li>Use the Nexus for interactive training and pro tips</li>
              <li>Let Mossy help you automate, audit, and publish your mods</li>
              <li>Ask for help or advanced workflows anytime</li>
            </ol>
          </div>

          <p className="text-slate-500 text-xs text-center">
            You can always access this onboarding again from Settings → Help & Tutorial
          </p>
        </div>
      )
    }
  ];
// Removed duplicate/incorrect 'ready' step. Only the correct steps array remains above.

  useEffect(() => {
    localStorage.setItem('mossy_privacy_settings', JSON.stringify(privacySettings));
  }, [privacySettings]);

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      // Save completion status
      localStorage.setItem('mossy_onboarding_completed', 'true');
      onComplete();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const step = steps[currentStep];

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl bg-slate-900 border-2 border-emerald-500/40 rounded-2xl shadow-2xl overflow-hidden" style={{boxShadow: '0 0 40px rgba(0,255,0,0.1)'}}>
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-800 to-slate-900 border-b border-slate-700 p-8">
          <div className="flex items-center gap-4 mb-4">
            {step.icon}
            <div>
              <h1 className="text-3xl font-bold text-white">{step.title}</h1>
              <p className="text-slate-400 text-sm">{step.description}</p>
            </div>
          </div>
          {/* Progress */}
          <div className="flex gap-2">
            {steps.map((s, i) => (
              <div
                key={s.id}
                className={`h-1 flex-1 rounded-full transition-colors ${
                  i === currentStep
                    ? 'bg-emerald-500'
                    : i < currentStep
                    ? 'bg-emerald-600/50'
                    : 'bg-slate-700'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="p-8 max-h-96 overflow-y-auto">
          {step.content}
        </div>

        {/* Footer */}
        <div className="border-t border-slate-700 p-8 bg-slate-900/50 flex items-center justify-between">
          <button
            onClick={handlePrev}
            disabled={currentStep === 0}
            className="flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-600 text-slate-300 hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronLeft className="w-4 h-4" /> Previous
          </button>

          <div className="text-slate-400 text-sm">
            Step {currentStep + 1} of {steps.length}
          </div>

          <button
            onClick={handleNext}
            className="flex items-center gap-2 px-6 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold transition-colors"
          >
            {currentStep === steps.length - 1 ? 'Start Using Mossy' : 'Next'}
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default MossyOnboarding;
import React, { useState, useEffect } from 'react';
import {
  ChevronRight,
  ChevronLeft,
  CheckCircle2,
  Lock,
  Share2,
  Shield,
  Settings,
  Database,
  BookOpen,
  Zap,
  AlertCircle,
  Layers,
  Package,
  BrainCircuit
} from 'lucide-react';
