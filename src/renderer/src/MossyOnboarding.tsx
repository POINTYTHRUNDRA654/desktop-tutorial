import React, { useState, useEffect } from 'react';
import { ChevronRight, ChevronLeft, CheckCircle2, Lock, Share2, Shield, Settings, Database, BookOpen, Zap, AlertCircle } from 'lucide-react';

interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  content: React.ReactNode;
}

interface ConnectionChoice {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  category: string;
  selected: boolean;
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

const MossyOnboarding: React.FC<{ onComplete: () => void }> = ({ onComplete }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [connections, setConnections] = useState<ConnectionChoice[]>([
    {
      id: 'creation-kit',
      name: 'Creation Kit',
      description: 'Fallout 4 Creation Kit for worldspace and quest editing',
      icon: <Zap className="w-6 h-6" />,
      category: 'Creation Tools',
      selected: false
    },
    {
      id: 'xedit',
      name: 'xEdit',
      description: 'Advanced record editor and cleaning tool',
      icon: <Settings className="w-6 h-6" />,
      category: 'Creation Tools',
      selected: false
    },
    {
      id: 'blender',
      name: 'Blender',
      description: '3D modeling and mesh creation',
      icon: <Zap className="w-6 h-6" />,
      category: 'Creation Tools',
      selected: false
    },
    {
      id: 'nifskope',
      name: 'NifSkope',
      description: 'NIF file editor for mesh optimization',
      icon: <Settings className="w-6 h-6" />,
      category: 'Creation Tools',
      selected: false
    },
    {
      id: 'papyrus-compiler',
      name: 'Papyrus Compiler',
      description: 'Fallout 4 script compilation',
      icon: <Zap className="w-6 h-6" />,
      category: 'Creation Tools',
      selected: false
    },
    {
      id: 'wyre-bash',
      name: 'Wrye Bash',
      description: 'Mod management and conflict resolution',
      icon: <Database className="w-6 h-6" />,
      category: 'Mod Tools',
      selected: false
    },
  ]);
  
  const [privacySettings, setPrivacySettings] = useState<PrivacySettings>({
    keepLocalOnly: true,
    shareModProjectData: false,
    shareScriptPatterns: false,
    shareMeshOptimizations: false,
    shareBugReports: false,
    contributeToKnowledgeBase: false,
    allowAnalytics: false
  });

  const toggleConnection = (id: string) => {
    setConnections(connections.map(c => 
      c.id === id ? { ...c, selected: !c.selected } : c
    ));
  };

  const togglePrivacySetting = (key: keyof PrivacySettings) => {
    setPrivacySettings(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const steps: OnboardingStep[] = [
    {
      id: 'welcome',
      title: 'Welcome to Mossy',
      description: 'Your AI companion for Fallout 4 modding',
      icon: <BookOpen className="w-12 h-12 text-blue-400" />,
      content: (
        <div className="space-y-6">
          <div className="bg-blue-900/20 border border-blue-400/30 rounded-lg p-6">
            <p className="text-slate-300 mb-4">
              Hello, Vault Dweller! I'm <span className="text-blue-300 font-bold">Mossy</span>, your AI assistant for Fallout 4 modding.
            </p>
            <p className="text-slate-400 text-sm mb-4">
              This tutorial will walk you through:
            </p>
            <ul className="space-y-2 text-slate-400 text-sm">
              <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-400" /> Connecting to your modding tools</li>
              <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-400" /> Setting your privacy preferences</li>
              <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-400" /> Choosing how your data is used</li>
              <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-400" /> Getting started with your first project</li>
            </ul>
          </div>
          <p className="text-slate-500 text-sm italic">
            Your privacy and security are my top priority. You're always in control of your data.
          </p>
        </div>
      )
    },
    {
      id: 'connections',
      title: 'Connect Your Tools',
      description: 'Choose which modding tools Mossy should integrate with',
      icon: <Zap className="w-12 h-12 text-yellow-400" />,
      content: (
        <div className="space-y-6">
          <p className="text-slate-400">
            Select the tools you have installed. I'll integrate with them to provide better assistance.
          </p>
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {connections.map(conn => (
              <button
                key={conn.id}
                onClick={() => toggleConnection(conn.id)}
                className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
                  conn.selected 
                    ? 'bg-emerald-500/20 border-emerald-500 text-emerald-200' 
                    : 'bg-black/20 border-slate-600 text-slate-400 hover:border-emerald-500/50'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className={`mt-1 ${conn.selected ? 'text-emerald-400' : 'text-slate-500'}`}>
                    {conn.icon}
                  </div>
                  <div className="flex-1">
                    <div className="font-bold text-slate-200">{conn.name}</div>
                    <div className="text-xs text-slate-500">{conn.description}</div>
                  </div>
                  <div className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 ${
                    conn.selected ? 'bg-emerald-500 border-emerald-500' : 'border-slate-600'
                  }`}>
                    {conn.selected && <CheckCircle2 className="w-4 h-4 text-white" />}
                  </div>
                </div>
              </button>
            ))}
          </div>
          <p className="text-slate-500 text-xs">
            You can add or remove tools later in Settings.
          </p>
        </div>
      )
    },
    {
      id: 'privacy',
      title: 'Your Privacy Settings',
      description: 'Control how your data is stored and used',
      icon: <Shield className="w-12 h-12 text-red-400" />,
      content: (
        <div className="space-y-6">
          <div className="bg-amber-900/20 border border-amber-400/30 rounded-lg p-4 flex gap-3">
            <AlertCircle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
            <p className="text-slate-300 text-sm">
              <span className="font-bold">Privacy First:</span> By default, all your personal data stays on your computer. You control what, if anything, is shared.
            </p>
          </div>

          <div className="space-y-4">
            {/* Keep Local Only */}
            <div className="border border-slate-700 rounded-lg p-4 bg-black/20">
              <div className="flex items-center justify-between mb-2">
                <label className="flex items-center gap-3 cursor-pointer flex-1">
                  <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                    privacySettings.keepLocalOnly ? 'bg-emerald-500 border-emerald-500' : 'border-slate-600'
                  }`}>
                    {privacySettings.keepLocalOnly && <CheckCircle2 className="w-4 h-4 text-white" />}
                  </div>
                  <div>
                    <div className="font-bold text-slate-200 flex items-center gap-2">
                      <Lock className="w-4 h-4" /> Keep All Data Local
                    </div>
                  </div>
                </label>
              </div>
              <p className="text-slate-500 text-sm ml-8">
                Store all project data, conversations, and learning on your computer only. Nothing is sent to external servers.
              </p>
            </div>

            {/* Knowledge Base Contribution */}
            <div className="border border-slate-700 rounded-lg p-4 bg-black/20">
              <div className="flex items-center justify-between mb-2">
                <label className="flex items-center gap-3 cursor-pointer flex-1">
                  <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                    privacySettings.contributeToKnowledgeBase ? 'bg-blue-500 border-blue-500' : 'border-slate-600'
                  }`}>
                    {privacySettings.contributeToKnowledgeBase && <CheckCircle2 className="w-4 h-4 text-white" />}
                  </div>
                  <div>
                    <div className="font-bold text-slate-200 flex items-center gap-2">
                      <Database className="w-4 h-4" /> Contribute to Knowledge Base
                    </div>
                  </div>
                </label>
              </div>
              <p className="text-slate-500 text-sm ml-8">
                Help all Mossy users by sharing script patterns, mesh optimization techniques, and modding solutions you discover. No personal data is included.
              </p>
            </div>

            {/* Script Patterns */}
            <div className="border border-slate-700 rounded-lg p-4 bg-black/20">
              <div className="flex items-center justify-between mb-2">
                <label className="flex items-center gap-3 cursor-pointer flex-1">
                  <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                    privacySettings.shareScriptPatterns ? 'bg-blue-500 border-blue-500' : 'border-slate-600'
                  }`}>
                    {privacySettings.shareScriptPatterns && <CheckCircle2 className="w-4 h-4 text-white" />}
                  </div>
                  <div>
                    <div className="font-bold text-slate-200">Share Script Patterns</div>
                  </div>
                </label>
              </div>
              <p className="text-slate-500 text-sm ml-8">
                Share code patterns and script techniques (without personal project details) to help improve recommendations for all users.
              </p>
            </div>

            {/* Mesh Optimizations */}
            <div className="border border-slate-700 rounded-lg p-4 bg-black/20">
              <div className="flex items-center justify-between mb-2">
                <label className="flex items-center gap-3 cursor-pointer flex-1">
                  <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                    privacySettings.shareMeshOptimizations ? 'bg-blue-500 border-blue-500' : 'border-slate-600'
                  }`}>
                    {privacySettings.shareMeshOptimizations && <CheckCircle2 className="w-4 h-4 text-white" />}
                  </div>
                  <div>
                    <div className="font-bold text-slate-200">Share Mesh Optimizations</div>
                  </div>
                </label>
              </div>
              <p className="text-slate-500 text-sm ml-8">
                Share anonymized 3D optimization techniques and best practices discovered during your work.
              </p>
            </div>

            {/* Bug Reports */}
            <div className="border border-slate-700 rounded-lg p-4 bg-black/20">
              <div className="flex items-center justify-between mb-2">
                <label className="flex items-center gap-3 cursor-pointer flex-1">
                  <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                    privacySettings.shareBugReports ? 'bg-blue-500 border-blue-500' : 'border-slate-600'
                  }`}>
                    {privacySettings.shareBugReports && <CheckCircle2 className="w-4 h-4 text-white" />}
                  </div>
                  <div>
                    <div className="font-bold text-slate-200">Share Bug Reports</div>
                  </div>
                </label>
              </div>
              <p className="text-slate-500 text-sm ml-8">
                Help improve Mossy and the Fallout 4 community by reporting bugs and issues you encounter.
              </p>
            </div>
          </div>

          <p className="text-slate-500 text-xs italic border-t border-slate-700 pt-4">
            These settings can be changed anytime in Settings → Privacy & Data. All shared data is anonymized and will never include your personal information.
          </p>
        </div>
      )
    },
    {
      id: 'ready',
      title: "You're All Set!",
      description: 'Ready to start modding',
      icon: <CheckCircle2 className="w-12 h-12 text-emerald-400" />,
      content: (
        <div className="space-y-6">
          <div className="bg-emerald-900/20 border border-emerald-400/30 rounded-lg p-6">
            <h3 className="font-bold text-emerald-200 mb-4">Your Mossy Setup is Ready!</h3>
            <div className="space-y-3 text-slate-300 text-sm">
              <div className="flex gap-3">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                <span><span className="font-bold">{connections.filter(c => c.selected).length} tools</span> connected and ready</span>
              </div>
              <div className="flex gap-3">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                <span>Privacy settings configured to your preferences</span>
              </div>
              <div className="flex gap-3">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                <span>Your data is secure and under your control</span>
              </div>
              <div className="flex gap-3">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                <span>Ready to start your first project!</span>
              </div>
            </div>
          </div>

          <div className="bg-blue-900/20 border border-blue-400/30 rounded-lg p-6">
            <h3 className="font-bold text-blue-200 mb-3 flex items-center gap-2">
              <BookOpen className="w-4 h-4" /> Next Steps
            </h3>
            <ol className="space-y-2 text-slate-300 text-sm list-decimal list-inside">
              <li>Create your first Fallout 4 mod project</li>
              <li>Start a conversation with me about your ideas</li>
              <li>Let me help you write scripts, design meshes, and plan quests</li>
              <li>Together, we'll create something amazing!</li>
            </ol>
          </div>

          <p className="text-slate-500 text-xs text-center">
            You can always access this tutorial again from Settings → Help & Tutorial
          </p>
        </div>
      )
    }
  ];

  useEffect(() => {
    // Save settings to localStorage when they change
    localStorage.setItem('mossy_connections', JSON.stringify(connections));
    localStorage.setItem('mossy_privacy_settings', JSON.stringify(privacySettings));
  }, [connections, privacySettings]);

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
