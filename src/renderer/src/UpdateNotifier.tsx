/**
 * Update Notifier - Checks for app updates and notifies user
 * Displays a notification modal when a new version is available
 */

import React, { useEffect, useState } from 'react';
import { AlertCircle, ArrowDownToLine, X } from 'lucide-react';
import { checkForUpdates } from './utils/githubReleaseChecker';
import { getCurrentVersion } from './utils/versionUtils';

interface UpdateInfo {
  available: boolean;
  currentVersion: string;
  latestVersion: string;
  releaseNotes?: string;
  downloadUrl?: string;
}

const UpdateNotifier: React.FC = () => {
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [dismissed, setDismissed] = useState(() => {
    // Don't show update modal if user dismissed it in this session
    return localStorage.getItem('mossy_update_dismissed') === 'true';
  });

  useEffect(() => {
    // Disable update checks (offline/private builds)
    return;

    const checkForUpdates_ = async () => {
      // Skip update checks in dev/localhost to avoid noisy 404s and external calls
      if (import.meta.env.DEV || window.location.hostname === 'localhost') {
        return;
      }

      try {
        const currentVersion = await getCurrentVersion();
        
        const result = await checkForUpdates(currentVersion);

        if (result && !dismissed) {
          setUpdateInfo({
            available: true,
            currentVersion,
            latestVersion: result.latestVersion,
            releaseNotes: result.releaseNotes,
            downloadUrl: result.downloadUrl
          });
          setShowModal(true);
        } else if (!result) {
          setUpdateInfo({
            available: false,
            currentVersion,
            latestVersion: currentVersion
          });
        }
      } catch (error) {
        console.warn('[UpdateNotifier] Failed to check for updates:', error);
      }
    };

    // Check for updates on mount and every 24 hours
    checkForUpdates_();
    const interval = setInterval(checkForUpdates_, 24 * 60 * 60 * 1000);

    return () => clearInterval(interval);
  }, [dismissed]);

  const handleDismiss = () => {
    setShowModal(false);
    localStorage.setItem('mossy_update_dismissed', 'true');
    setDismissed(true);
  };

  const handleDownload = () => {
    if (updateInfo?.downloadUrl) {
      window.open(updateInfo.downloadUrl, '_blank');
    }
    handleDismiss();
  };

  if (!showModal || !updateInfo?.available) {
    return null;
  }

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0, 0, 0, 0.7)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10000
      }}
    >
      <div
        style={{
          background: 'linear-gradient(135deg, #1a3a1a 0%, #0f1f0f 100%)',
          border: '2px solid #00d000',
          borderRadius: '8px',
          padding: '2rem',
          maxWidth: '500px',
          width: '90%',
          boxShadow: '0 0 40px rgba(0, 255, 0, 0.4)'
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <AlertCircle className="w-6 h-6" style={{ color: '#00ff00' }} />
            <div
              style={{
                fontSize: '1rem',
                textTransform: 'uppercase',
                letterSpacing: '2px',
                color: '#00d000',
                fontWeight: 'bold',
                fontFamily: 'Orbitron, monospace'
              }}
            >
              UPDATE AVAILABLE
            </div>
          </div>
          <button
            onClick={handleDismiss}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#00d000',
              cursor: 'pointer',
              fontSize: '1.5rem',
              padding: '0'
            }}
          >
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div style={{ marginBottom: '1.5rem' }}>
          <p
            style={{
              color: '#00ff00',
              marginBottom: '1rem',
              fontFamily: 'monospace',
              fontSize: '0.875rem'
            }}
          >
            A new version of Mossy is available!
          </p>
          <div
            style={{
              background: '#0a0e0a',
              border: '1px solid #00d000',
              borderRadius: '4px',
              padding: '1rem',
              marginBottom: '1rem'
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                marginBottom: '0.5rem',
                fontSize: '0.875rem',
                color: '#008000',
                fontFamily: 'monospace'
              }}
            >
              <span>Current Version:</span>
              <span style={{ color: '#00ff00' }}>{updateInfo.currentVersion}</span>
            </div>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: '0.875rem',
                color: '#008000',
                fontFamily: 'monospace'
              }}
            >
              <span>Latest Version:</span>
              <span style={{ color: '#00ff00' }}>{updateInfo.latestVersion}</span>
            </div>
          </div>

          {updateInfo.releaseNotes && (
            <div
              style={{
                background: '#0a0e0a',
                border: '1px solid #00d000',
                borderRadius: '4px',
                padding: '1rem',
                marginBottom: '1rem',
                maxHeight: '150px',
                overflowY: 'auto'
              }}
            >
              <p
                style={{
                  color: '#008000',
                  fontSize: '0.75rem',
                  fontFamily: 'monospace',
                  marginBottom: '0.5rem',
                  margin: 0
                }}
              >
                RELEASE NOTES:
              </p>
              <p
                style={{
                  color: '#00ff00',
                  fontSize: '0.8rem',
                  lineHeight: '1.4',
                  margin: '0.5rem 0 0 0',
                  whiteSpace: 'pre-wrap',
                  wordWrap: 'break-word'
                }}
              >
                {updateInfo.releaseNotes}
              </p>
            </div>
          )}
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: '1rem' }}>
          <button
            onClick={handleDownload}
            style={{
              flex: 1,
              padding: '0.75rem',
              background: '#003300',
              border: '1px solid #00d000',
              color: '#00ff00',
              fontFamily: 'monospace',
              fontSize: '0.875rem',
              cursor: 'pointer',
              borderRadius: '4px',
              fontWeight: 'bold',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#004400';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = '#003300';
            }}
          >
            <ArrowDownToLine size={16} />
            DOWNLOAD
          </button>
          <button
            onClick={handleDismiss}
            style={{
              flex: 1,
              padding: '0.75rem',
              background: 'transparent',
              border: '1px solid #00d000',
              color: '#00ff00',
              fontFamily: 'monospace',
              fontSize: '0.875rem',
              cursor: 'pointer',
              borderRadius: '4px',
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#003300';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
            }}
          >
            LATER
          </button>
        </div>
      </div>
    </div>
  );
};

export default UpdateNotifier;
