/**
 * Version Info Component
 * Displays current application version from package.json
 * Ensures version consistency between codebase and running app
 */

import React, { useState, useEffect } from 'react';
import { Info, CheckCircle, AlertTriangle } from 'lucide-react';
import packageJson from '../../../package.json';

interface VersionInfoProps {
  embedded?: boolean;
}

const VersionInfo: React.FC<VersionInfoProps> = ({ embedded = false }) => {
  const [appVersion, setAppVersion] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [versionMatch, setVersionMatch] = useState<boolean>(true);

  // Version from package.json (build-time)
  const packageVersion = packageJson.version;

  useEffect(() => {
    // Get version from Electron main process
    const fetchAppVersion = async () => {
      try {
        if (window.electron?.api?.getAppVersion) {
          const result = await window.electron.api.getAppVersion();
          if (result.success && result.version) {
            setAppVersion(result.version);
            setVersionMatch(result.version === packageVersion);
          } else {
            // Fallback to package.json version
            setAppVersion(packageVersion);
          }
        } else {
          // No Electron API available, use package.json
          setAppVersion(packageVersion);
        }
      } catch (error) {
        console.warn('[VersionInfo] Failed to get app version:', error);
        setAppVersion(packageVersion);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAppVersion();
  }, [packageVersion]);

  const containerClass = embedded
    ? 'bg-slate-900/30 border border-slate-800 rounded-lg p-4'
    : 'bg-[#0a0e0a] border border-emerald-700/30 rounded-lg p-6';

  if (isLoading) {
    return (
      <div className={containerClass}>
        <div className="flex items-center gap-2 text-slate-400">
          <Info className="w-4 h-4" />
          <span className="text-sm">Loading version info...</span>
        </div>
      </div>
    );
  }

  return (
    <div className={containerClass}>
      <div className="flex items-start gap-3">
        <Info className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <h3 className="text-sm font-bold text-white mb-2">Application Version</h3>
          
          <div className="space-y-2 text-xs font-mono">
            <div className="flex justify-between items-center">
              <span className="text-slate-400">Package Version:</span>
              <span className="text-emerald-300 font-semibold">{packageVersion}</span>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-slate-400">Running Version:</span>
              <span className="text-emerald-300 font-semibold">{appVersion}</span>
            </div>

            <div className="pt-2 border-t border-slate-800">
              <div className="flex items-center gap-2">
                {versionMatch ? (
                  <>
                    <CheckCircle className="w-4 h-4 text-green-400" />
                    <span className="text-green-400">Version Consistent</span>
                  </>
                ) : (
                  <>
                    <AlertTriangle className="w-4 h-4 text-yellow-400" />
                    <span className="text-yellow-400">Version Mismatch Detected</span>
                  </>
                )}
              </div>
              {!versionMatch && (
                <p className="text-xs text-yellow-400/80 mt-2">
                  The running version doesn't match package.json. This may happen after an update.
                  Try restarting the application.
                </p>
              )}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-800">
            <p className="text-xs text-slate-400 leading-relaxed">
              <strong className="text-slate-300">Version Management:</strong> Mossy uses semantic versioning (MAJOR.MINOR.PATCH).
              The version displayed here comes directly from package.json to ensure consistency between
              development and production builds.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VersionInfo;
