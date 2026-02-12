/**
 * Auto-Update Notifier Component
 * 
 * Shows notification when updates are available
 * Allows user to download and install updates with approval
 */

import React, { useEffect, useState } from 'react';
import { Download, RefreshCw, X, CheckCircle2, AlertCircle } from 'lucide-react';

interface UpdateStatus {
  checking: boolean;
  available: boolean;
  downloading: boolean;
  downloaded: boolean;
  error: string | null;
  progress: number;
  version: string | null;
  releaseNotes: string | null;
}

export const AutoUpdateNotifier: React.FC = () => {
  const [status, setStatus] = useState<UpdateStatus | null>(null);
  const [showNotification, setShowNotification] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const api = (window as any).electron?.api || (window as any).electronAPI;
    
    if (!api) {
      console.log('[AutoUpdateNotifier] Electron API not available');
      return;
    }

    // Listen for update status changes
    const unsubscribe = api.onUpdateStatus((newStatus: UpdateStatus) => {
      console.log('[AutoUpdateNotifier] Status update:', newStatus);
      setStatus(newStatus);
      
      // Show notification when update is available or downloaded
      if ((newStatus.available || newStatus.downloaded) && !dismissed) {
        setShowNotification(true);
      }
    });

    // Get initial status
    api.getUpdateStatus().then((result: any) => {
      if (result.success && result.status) {
        setStatus(result.status);
        if ((result.status.available || result.status.downloaded) && !dismissed) {
          setShowNotification(true);
        }
      }
    }).catch((err: any) => {
      console.error('[AutoUpdateNotifier] Failed to get status:', err);
    });

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [dismissed]);

  const handleDownload = async () => {
    const api = (window as any).electron?.api || (window as any).electronAPI;
    if (!api) return;

    try {
      const result = await api.downloadUpdate();
      if (!result.success) {
        console.error('[AutoUpdateNotifier] Download failed:', result.error);
      }
    } catch (err) {
      console.error('[AutoUpdateNotifier] Download error:', err);
    }
  };

  const handleInstall = async () => {
    const api = (window as any).electron?.api || (window as any).electronAPI;
    if (!api) return;

    try {
      const result = await api.installUpdate();
      if (!result.success) {
        console.error('[AutoUpdateNotifier] Install failed:', result.error);
      }
    } catch (err) {
      console.error('[AutoUpdateNotifier] Install error:', err);
    }
  };

  const handleDismiss = () => {
    setShowNotification(false);
    setDismissed(true);
  };

  if (!showNotification || !status) {
    return null;
  }

  return (
    <div className="fixed bottom-6 right-6 z-[9999] max-w-md">
      <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 border-2 border-emerald-500/40 rounded-xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-500/20 to-blue-500/20 border-b border-emerald-500/30 px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {status.downloaded ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              ) : status.error ? (
                <AlertCircle className="w-5 h-5 text-red-400" />
              ) : (
                <Download className="w-5 h-5 text-blue-400" />
              )}
              <span className="text-white font-bold">
                {status.downloaded ? 'Update Ready!' : status.downloading ? 'Downloading...' : 'Update Available'}
              </span>
            </div>
            <button
              onClick={handleDismiss}
              className="text-slate-400 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 space-y-3">
          {/* Version info */}
          {status.version && (
            <div className="text-sm">
              <span className="text-slate-400">Version </span>
              <span className="text-emerald-400 font-semibold">{status.version}</span>
              <span className="text-slate-400"> is available</span>
            </div>
          )}

          {/* Release notes */}
          {status.releaseNotes && (
            <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-3 max-h-32 overflow-y-auto">
              <p className="text-xs text-slate-300 whitespace-pre-line">
                {status.releaseNotes}
              </p>
            </div>
          )}

          {/* Progress bar for downloading */}
          {status.downloading && (
            <div className="space-y-2">
              <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-emerald-500 to-blue-500 transition-all duration-300"
                  style={{ width: `${status.progress}%` }}
                />
              </div>
              <div className="text-xs text-slate-400 text-center">
                {Math.round(status.progress)}% downloaded
              </div>
            </div>
          )}

          {/* Error message */}
          {status.error && (
            <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-3">
              <p className="text-xs text-red-300">{status.error}</p>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex gap-2 pt-2">
            {status.downloaded ? (
              <>
                <button
                  onClick={handleInstall}
                  className="flex-1 bg-gradient-to-r from-emerald-500 to-blue-500 hover:from-emerald-600 hover:to-blue-600 text-white font-medium py-2 px-4 rounded-lg transition-all flex items-center justify-center gap-2"
                >
                  <RefreshCw className="w-4 h-4" />
                  Restart & Install
                </button>
                <button
                  onClick={handleDismiss}
                  className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors text-sm"
                >
                  Later
                </button>
              </>
            ) : status.available && !status.downloading && !status.error ? (
              <>
                <button
                  onClick={handleDownload}
                  className="flex-1 bg-gradient-to-r from-emerald-500 to-blue-500 hover:from-emerald-600 hover:to-blue-600 text-white font-medium py-2 px-4 rounded-lg transition-all flex items-center justify-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  Download Now
                </button>
                <button
                  onClick={handleDismiss}
                  className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors text-sm"
                >
                  Later
                </button>
              </>
            ) : null}
          </div>

          {/* Info text */}
          <p className="text-xs text-slate-500 text-center">
            {status.downloaded 
              ? 'The update will be installed when you restart Mossy'
              : 'Updates are downloaded in the background'}
          </p>
        </div>
      </div>
    </div>
  );
};

export default AutoUpdateNotifier;
