import React, { useState, useEffect } from 'react';
import { X, Sparkles, CheckCircle } from 'lucide-react';

interface WhatsNewDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export const WhatsNewDialog: React.FC<WhatsNewDialogProps> = ({ isOpen, onClose }) => {
  const [dontShowAgain, setDontShowAgain] = useState(false);

  const features = [
    {
      title: "Enhanced AI Chat",
      description: "Improved conversation memory and context awareness for better assistance.",
      icon: "🤖"
    },
    {
      title: "Project Management",
      description: "Create, switch, and manage multiple modding projects with ease.",
      icon: "📁"
    },
    {
      title: "Neural Link Integration",
      description: "Real-time monitoring of Blender, Creation Kit, and other modding tools.",
      icon: "🧠"
    },
    {
      title: "Advanced Asset Analysis",
      description: "Comprehensive NIF, DDS, and ESP file validation with performance warnings.",
      icon: "🔍"
    },
    {
      title: "Global Search",
      description: "Search across all modules and features with Ctrl+K shortcut.",
      icon: "🔎"
    },
    {
      title: "Favorites System",
      description: "Bookmark frequently used tools for quick access.",
      icon: "⭐"
    }
  ];

  const handleClose = () => {
    if (dontShowAgain) {
      localStorage.setItem('mossy_whats_new_dismissed', 'true');
    }
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-lg shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-700">
          <div className="flex items-center gap-3">
            <Sparkles className="w-6 h-6 text-yellow-400" />
            <h2 className="text-xl font-bold text-white">What's New in Mossy v4.0</h2>
          </div>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          <div className="grid gap-4">
            {features.map((feature, index) => (
              <div key={index} className="flex items-start gap-4 p-4 bg-slate-800/50 rounded-lg">
                <div className="text-2xl">{feature.icon}</div>
                <div className="flex-1">
                  <h3 className="font-semibold text-white mb-1">{feature.title}</h3>
                  <p className="text-slate-300 text-sm">{feature.description}</p>
                </div>
                <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0 mt-1" />
              </div>
            ))}
          </div>

          {/* Footer */}
          <div className="mt-6 pt-4 border-t border-slate-700">
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 text-sm text-slate-400">
                <input
                  type="checkbox"
                  checked={dontShowAgain}
                  onChange={(e) => setDontShowAgain(e.target.checked)}
                  className="rounded border-slate-600 bg-slate-800 text-green-400 focus:ring-green-400"
                />
                Don't show this again
              </label>
              <button
                onClick={handleClose}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors font-medium"
              >
                Get Started
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Hook to manage "What's New" dialog state
export const useWhatsNew = () => {
  const [showWhatsNew, setShowWhatsNew] = useState(false);

  useEffect(() => {
    // Check if user has dismissed the dialog before
    const dismissed = localStorage.getItem('mossy_whats_new_dismissed');
    if (!dismissed) {
      // Show after a brief delay to avoid overwhelming new users
      const timer = setTimeout(() => {
        setShowWhatsNew(true);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, []);

  const dismissWhatsNew = () => setShowWhatsNew(false);

  return { showWhatsNew, dismissWhatsNew };
};