import React, { useState, useEffect } from 'react';
import { X, Sparkles, CheckCircle } from 'lucide-react';
import packageJson from '../../../package.json';
import { getWhatsNewReleaseData } from './services/whatsNewReleaseNotes';

interface WhatsNewDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export const WhatsNewDialog: React.FC<WhatsNewDialogProps> = ({ isOpen, onClose }) => {
  const [dontShowAgain, setDontShowAgain] = useState(false);
  const releaseData = getWhatsNewReleaseData(packageJson.version);

  const features = releaseData.features.map((feature, index) => ({
    ...feature,
    icon: index % 2 === 0 ? '✨' : '🛠️',
  }));

  const handleClose = () => {
    if (dontShowAgain) {
      try {
        // Store the current version as dismissed so the dialog re-appears on the next release
        localStorage.setItem('mossy_whats_new_dismissed_version', packageJson.version);
        // Migrate: remove old boolean flag so version-based check takes over
        localStorage.removeItem('mossy_whats_new_dismissed');
      } catch (err) {
        // Don't block closing the dialog if storage is unavailable
        console.warn('[WhatsNewDialog] could not persist dismissal:', err);
      }
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
            <h2 className="text-xl font-bold text-white">What's New in Mossy v{packageJson.version}</h2>
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
          {!releaseData.hasExactMatch && releaseData.renderedVersion && (
            <div className="mb-4 rounded-lg border border-amber-700/40 bg-amber-900/20 p-3 text-xs text-amber-200">
              No changelog entry was found for v{releaseData.requestedVersion} yet. Showing latest notes from v{releaseData.renderedVersion}.
            </div>
          )}
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

// Sentinel value used when migrating from the old boolean-flag dismissal system.
// Any stored version that matches this value is treated as "dismissed before version
// tracking existed" — the dialog will re-appear since we can't know which exact
// version they dismissed.
const LEGACY_DISMISSED_VERSION = '__legacy__';

// Hook to manage "What's New" dialog state
export const useWhatsNew = () => {
  const [showWhatsNew, setShowWhatsNew] = useState(false);

  useEffect(() => {
    // Version-aware dismissal: show again whenever the app version changes.
    // If the user checked "Don't show again" for this exact version, respect that.
    // Otherwise always show on the first launch of each new release.
    const dismissedVersion = (() => {
      try {
        // Check new version-aware key first
        const v = localStorage.getItem('mossy_whats_new_dismissed_version');
        if (v) return v;
        // Migrate old boolean key: treat as dismissed for any version before current
        if (localStorage.getItem('mossy_whats_new_dismissed') === 'true') return LEGACY_DISMISSED_VERSION;
        return null;
      } catch { return null; }
    })();
    const permanentlyDismissed = dismissedVersion === packageJson.version;
    const sessionDismissed = (() => {
      try { return sessionStorage.getItem('mossy_whats_new_session_dismissed') === 'true'; } catch { return false; }
    })();

    if (!permanentlyDismissed && !sessionDismissed) {
      // Show after a brief delay to avoid overwhelming new users
      const timer = setTimeout(() => setShowWhatsNew(true), 2000);
      return () => clearTimeout(timer);
    }

    return;
  }, []);

  // Dismiss for the current session (and optionally persist permanently elsewhere)
  const dismissWhatsNew = (persistSession = true) => {
    setShowWhatsNew(false);
    if (persistSession) {
      try { sessionStorage.setItem('mossy_whats_new_session_dismissed', 'true'); } catch { /* ignore */ }
    }
  };

  return { showWhatsNew, dismissWhatsNew };
};
