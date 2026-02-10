import React, { useEffect, useState } from 'react';
import { ExternalLink, Play } from 'lucide-react';
import type { Settings } from '../../../shared/types';

export type ToolKey = 'xeditPath' | 'nifSkopePath' | 'fomodCreatorPath' | 'creationKitPath' | 'blenderPath';

interface ExternalToolNoticeProps {
  toolKey: ToolKey;
  toolName: string;
  nexusUrl?: string;
  description?: string;
  className?: string;
}

const ExternalToolNotice: React.FC<ExternalToolNoticeProps> = ({
  toolKey,
  toolName,
  nexusUrl,
  description,
  className,
}) => {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [launching, setLaunching] = useState(false);

  useEffect(() => {
    const init = async () => {
      try {
        const s = await window.electronAPI.getSettings();
        setSettings(s);
        const unsubscribe = window.electronAPI.onSettingsUpdated((newSettings) => setSettings(newSettings));
        return unsubscribe;
      } catch (e) {
        console.warn('[ExternalToolNotice] Failed to load settings', e);
      }
    };
    let cleanup: (() => void) | void;
    init().then((unsub) => { cleanup = unsub; }).catch(() => {});
    return () => {
      if (typeof cleanup === 'function') cleanup();
    };
  }, []);

  const path = settings ? (settings[toolKey] as string | undefined) : undefined;
  const canLaunch = !!path && path.trim().length > 0;

  const handleLaunch = async () => {
    if (!canLaunch || !path) return;
    setLaunching(true);
    try {
      const bridge = (window as any).electron?.api;
      if (bridge?.openProgram) {
        const result: any = await bridge.openProgram(path);
        if (result && result.success === false) {
           alert(`Could not launch ${toolName}: ${result.error || 'Unknown error'}`);
        }
      } else if (bridge?.openExternal) {
        await bridge.openExternal(path);
      } else {
        alert('Launching external tools requires the Desktop Bridge (Electron).');
      }
    } catch (e) {
      console.error('Failed to launch tool:', e);
      alert(`Could not launch ${toolName}. Check the configured path in Settings.`);
    } finally {
      setLaunching(false);
    }
  };

  return (
    <div className={`rounded-lg border p-3 text-xs ${canLaunch ? 'border-emerald-700 bg-emerald-900/20' : 'border-slate-700 bg-slate-900/30'} ${className || ''}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="font-bold text-white">{toolName}</span>
          {canLaunch ? (
            <span className="text-emerald-400 font-bold">Configured</span>
          ) : (
            <span className="text-slate-400">Not configured</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {canLaunch && (
            <button
              onClick={handleLaunch}
              disabled={launching}
              className="px-2 py-1 bg-emerald-700 hover:bg-emerald-600 border border-emerald-500 rounded text-[11px] font-bold flex items-center gap-1 transition-all disabled:opacity-50"
              title={`Launch ${toolName}`}
            >
              <Play className="w-3 h-3" /> Launch
            </button>
          )}
        </div>
      </div>
      {!canLaunch && (
        <div className="mt-2 text-[11px] text-slate-400">
          Configure this tool in Settings &gt; Tools.
        </div>
      )}
      {description && (
        <p className="mt-2 text-slate-300">{description}</p>
      )}
      {nexusUrl && (
        <div className="mt-2">
          <a
            href={nexusUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-blue-400 hover:text-blue-300 font-bold"
            title={`Download ${toolName} from Nexus Mods`}
          >
            <ExternalLink className="w-3 h-3" /> Download from Nexus Mods
          </a>
        </div>
      )}
    </div>
  );
};

export default ExternalToolNotice;
