import React, { useState } from 'react';
import { RotateCcw, AlertTriangle, CheckCircle2 } from 'lucide-react';

interface TutorialResetSettingsProps {
  embedded?: boolean;
}

const TutorialResetSettings: React.FC<TutorialResetSettingsProps> = ({ embedded = false }) => {
  const [showConfirm, setShowConfirm] = useState(false);
  const [resetComplete, setResetComplete] = useState(false);

  const handleResetTutorial = () => {
    // Clear all onboarding-related localStorage items
    localStorage.removeItem('mossy_has_booted');
    localStorage.removeItem('mossy_onboarding_complete');
    localStorage.removeItem('mossy_onboarding_completed');
    localStorage.removeItem('mossy_tutorial_completed');
    localStorage.removeItem('mossy_tutorial_autostart');
    localStorage.removeItem('mossy_voice_setup_complete');
    
    // Optional: Clear scan results and tool preferences
    // localStorage.removeItem('mossy_all_detected_apps');
    // localStorage.removeItem('mossy_scan_summary');
    // localStorage.removeItem('mossy_tool_preferences');
    // localStorage.removeItem('mossy_integrated_tools');
    // localStorage.removeItem('mossy_last_scan');

    setShowConfirm(false);
    setResetComplete(true);

    // Show success message for a few seconds
    setTimeout(() => {
      setResetComplete(false);
    }, 3000);

    // Reload the app after a short delay
    setTimeout(() => {
      window.location.reload();
    }, 1500);
  };

  const containerClass = embedded
    ? 'space-y-4'
    : 'min-h-full bg-[#0b0f0b] text-slate-100 p-6 md:p-10';

  const contentClass = embedded ? '' : 'max-w-4xl mx-auto';

  return (
    <div className={containerClass}>
      <div className={contentClass}>
        {!embedded && (
          <div className="mb-8">
            <h1 className="text-3xl font-black text-white mb-2 flex items-center gap-3">
              <RotateCcw className="w-8 h-8 text-emerald-400" />
              Tutorial & Onboarding
            </h1>
            <p className="text-sm text-slate-300">
              Reset your onboarding progress to re-experience the installation tutorial.
            </p>
          </div>
        )}

        <div className="space-y-6">
          {/* Reset Tutorial Section */}
          <div className="bg-slate-900/50 rounded-lg border border-slate-800 p-6">
            <div className="flex items-start gap-4 mb-4">
              <RotateCcw className="w-6 h-6 text-emerald-400 flex-shrink-0 mt-1" />
              <div className="flex-1">
                <h3 className="text-lg font-bold text-white mb-2">Replay Installation Tutorial</h3>
                <p className="text-sm text-slate-300 mb-4">
                  Restart the first-run experience, including the system scan, tool recommendations, 
                  and onboarding flow. This will clear your onboarding progress but keep all your 
                  settings, API keys, and user data intact.
                </p>

                <div className="bg-blue-900/20 border border-blue-700/30 rounded-lg p-4 mb-4">
                  <h4 className="text-sm font-bold text-blue-300 mb-2">What will be reset:</h4>
                  <ul className="text-xs text-slate-300 space-y-1 list-disc list-inside">
                    <li>First-run onboarding completion flag</li>
                    <li>Tutorial completion status</li>
                    <li>Voice setup wizard status</li>
                    <li>Boot animation flag</li>
                  </ul>
                </div>

                <div className="bg-emerald-900/20 border border-emerald-700/30 rounded-lg p-4 mb-4">
                  <h4 className="text-sm font-bold text-emerald-300 mb-2">What will be preserved:</h4>
                  <ul className="text-xs text-slate-300 space-y-1 list-disc list-inside">
                    <li>All settings and API keys</li>
                    <li>Detected programs and tool paths</li>
                    <li>System scan results</li>
                    <li>Tool preferences and integrated tools</li>
                    <li>Knowledge Vault and custom data</li>
                    <li>Project data and mod configurations</li>
                  </ul>
                </div>

                {!showConfirm && !resetComplete && (
                  <button
                    type="button"
                    onClick={() => setShowConfirm(true)}
                    className="px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-bold transition-colors flex items-center gap-2"
                  >
                    <RotateCcw className="w-4 h-4" />
                    Replay Tutorial
                  </button>
                )}

                {showConfirm && (
                  <div className="bg-amber-900/20 border border-amber-700/30 rounded-lg p-4 space-y-4">
                    <div className="flex items-start gap-3">
                      <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <h4 className="text-sm font-bold text-amber-300 mb-2">Confirm Reset</h4>
                        <p className="text-xs text-slate-300 mb-4">
                          The app will reload and show the installation tutorial again. 
                          You'll go through the system scan, tool recommendations, and onboarding steps.
                          Are you sure you want to continue?
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={handleResetTutorial}
                        className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-lg font-bold transition-colors text-sm"
                      >
                        Yes, Reset Tutorial
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowConfirm(false)}
                        className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-medium transition-colors text-sm"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}

                {resetComplete && (
                  <div className="bg-emerald-900/20 border border-emerald-700/30 rounded-lg p-4 flex items-center gap-3">
                    <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                    <div className="text-sm text-emerald-300 font-medium">
                      Tutorial reset complete! Reloading app...
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Info Section */}
          <div className="bg-slate-900/30 border border-slate-800 rounded-lg p-4">
            <h4 className="text-sm font-bold text-slate-200 mb-2">💡 Tip</h4>
            <p className="text-xs text-slate-400">
              The installation tutorial includes a system scan that detects modding tools, 
              AI software, and NVIDIA utilities. It's a great way to see what Mossy can integrate with!
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TutorialResetSettings;
