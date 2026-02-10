import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, AlertTriangle, FolderOpen, Play, RefreshCw } from 'lucide-react';
import { ToolsInstallVerifyPanel } from './components/ToolsInstallVerifyPanel';

type ToolKey =
  | 'xeditPath'
  | 'creationKitPath'
  | 'archive2Path'
  | 'blenderPath'
  | 'bodySlidePath'
  | 'outfitStudioPath'
  | 'nifSkopePath'
  | 'baePath';

type ToolDef = {
  key: ToolKey;
  label: string;
  note?: string;
};

type ToolStatus = {
  exists?: boolean;
  isFile?: boolean;
  isDirectory?: boolean;
  version?: string;
  error?: string;
};

const getBridge = (): any => (window as any).electron?.api || (window as any).electronAPI;

const TOOLS: ToolDef[] = [
  { key: 'xeditPath', label: 'xEdit (FO4Edit)', note: 'Needed for load order + scripted edits.' },
  { key: 'creationKitPath', label: 'Creation Kit', note: 'Quest/dialog authoring.' },
  { key: 'archive2Path', label: 'Archive2', note: 'BA2 packaging.' },
  { key: 'blenderPath', label: 'Blender', note: 'Mesh/animation authoring.' },
  { key: 'bodySlidePath', label: 'BodySlide', note: 'Batch body/armor builds.' },
  { key: 'outfitStudioPath', label: 'Outfit Studio', note: 'Mesh fitting + sliders.' },
  { key: 'nifSkopePath', label: 'NifSkope', note: 'Inspect meshes/materials.' },
  { key: 'baePath', label: 'BAE (Bethesda Archive Extractor)', note: 'Extract BA2 archives.' },
];

type ToolVerifyProps = {
  embedded?: boolean;
};

const ToolVerify: React.FC<ToolVerifyProps> = ({ embedded = false }) => {
  const bridge = useMemo(() => getBridge(), []);
  const [settings, setSettings] = useState<any>(null);
  const [status, setStatus] = useState<string>('');
  const [toolStatus, setToolStatus] = useState<Record<ToolKey, ToolStatus>>({} as any);

  const loadSettings = async () => {
    if (!bridge?.getSettings) {
      setStatus('Desktop API not available (running in web mode).');
      return;
    }
    const s = await bridge.getSettings();
    setSettings(s);
    setStatus('');
  };

  useEffect(() => {
    loadSettings().catch((e) => setStatus(String(e?.message || e)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!bridge?.onSettingsUpdated) return;
    bridge.onSettingsUpdated((s: any) => setSettings(s));
  }, [bridge]);

  const refreshToolChecks = async () => {
    if (!bridge) return;
    const next: Record<ToolKey, ToolStatus> = { ...toolStatus };

    for (const t of TOOLS) {
      const path = String(settings?.[t.key] || '').trim();
      if (!path) {
        next[t.key] = { exists: false };
        continue;
      }

      try {
        const stat = bridge.fsStat ? await bridge.fsStat(path) : { exists: true, isFile: true, isDirectory: false };
        let version = '';
        if (bridge.getToolVersion && stat?.exists && stat?.isFile) {
          try {
            version = await bridge.getToolVersion(path);
          } catch {
            version = '';
          }
        }
        next[t.key] = { ...stat, version };
      } catch (e) {
        next[t.key] = { error: String((e as any)?.message || e) };
      }
    }

    setToolStatus(next);
    setStatus('Checks refreshed.');
  };

  useEffect(() => {
    if (!settings) return;
    refreshToolChecks().catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings]);

  const setToolPath = async (tool: ToolDef) => {
    if (!bridge?.pickToolPath || !bridge?.setSettings) {
      setStatus('pickToolPath/setSettings not available.');
      return;
    }

    const chosen = await bridge.pickToolPath(tool.label);
    if (!chosen) {
      setStatus('Canceled.');
      return;
    }

    await bridge.setSettings({ [tool.key]: chosen });
    setStatus(`Set ${tool.label}`);
  };

  const launchTool = async (tool: ToolDef) => {
    const path = String(settings?.[tool.key] || '').trim();
    if (!path) return;

    if (bridge?.openProgram) {
      const res = await bridge.openProgram(path);
      if (res?.success) setStatus(`Launched ${tool.label}`);
      else setStatus(res?.error || `Failed to launch ${tool.label}`);
      return;
    }

    setStatus('openProgram not available.');
  };

  const revealTool = async (tool: ToolDef) => {
    const path = String(settings?.[tool.key] || '').trim();
    if (!path) return;

    if (bridge?.revealInFolder) {
      const res = await bridge.revealInFolder(path);
      if (res?.success) setStatus('Revealed in Explorer.');
      else setStatus(res?.error || 'Failed to reveal.');
      return;
    }

    setStatus('revealInFolder not available.');
  };

  const containerClassName = embedded ? 'bg-slate-950 p-4 text-slate-200' : 'min-h-screen bg-slate-950 p-8 pb-24 text-slate-200';

  return (
    <div className={containerClassName}>
      <div className="max-w-6xl mx-auto">
        {!embedded && (
          <div className="flex items-start justify-between gap-4 mb-6">
            <div>
              <h1 className="text-3xl font-bold text-white">Tool Verify</h1>
              <p className="text-slate-400 mt-1 text-sm">
                Point Mossy at your modding tools, verify paths, and do a quick test launch.
              </p>
            </div>
            <div className="flex gap-2">
              <Link
                to="/reference"
                className="px-3 py-2 text-[10px] font-black uppercase tracking-widest rounded bg-emerald-900/20 border border-emerald-500/30 text-emerald-100 hover:bg-emerald-900/30 transition-colors"
                title="Open help"
              >
                Help
              </Link>
              <button
                onClick={() => refreshToolChecks().catch(() => {})}
                className="px-3 py-2 rounded bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-semibold flex items-center gap-2"
                title="Re-check paths and versions"
              >
                <RefreshCw className="w-4 h-4" /> Refresh
              </button>
            </div>
          </div>
        )}

        {status && <div className="text-xs text-slate-400 font-mono mb-4 break-words">{status}</div>}

        <ToolsInstallVerifyPanel
          title="🧪 Recommended setup sequence"
          description="Start here if you're new: set your tool paths, then confirm each one launches. This page does not install tools, but it will tell you what's missing."
          tools={[
            {
              label: 'xEdit (FO4Edit) download',
              href: 'https://www.nexusmods.com/fallout4/mods/2737',
              note: 'Official Nexus page (pick the right x64 build).',
              kind: 'official',
            },
            {
              label: 'Blender download',
              href: 'https://www.blender.org/download/',
              note: 'Official Blender downloads.',
              kind: 'official',
            },
            {
              label: 'Creation Kit (Steam)',
              href: 'https://store.steampowered.com/app/1946160/Fallout_4_Creation_Kit/',
              note: 'Install via Steam then set the exe path.',
              kind: 'official',
            },
          ]}
          verify={[
            'Set tool paths (Browse).',
            'Confirm each tool shows “OK” and has a version when possible.',
            'Test Launch and ensure it opens.',
          ]}
          troubleshooting={[
            'If you see “Desktop API not available”, you may be running the web build (no filesystem access).',
            'If a path exists but shows no version, that tool may not expose Windows version metadata.',
          ]}
          accentClassName="text-emerald-300"
        />

        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
          <div className="px-4 py-3 bg-slate-800 border-b border-slate-700 flex items-center justify-between">
            <div className="text-xs font-bold text-slate-200">Tool Status</div>
            <div className="text-[10px] text-slate-400">{TOOLS.length}</div>
          </div>

          <div className="p-4 space-y-3">
            {TOOLS.map((t) => {
              const path = String(settings?.[t.key] || '').trim();
              const st = toolStatus[t.key] || {};
              const ok = !!path && st.exists && (st.isFile || st.isDirectory);

              return (
                <div key={t.key} className="p-3 rounded border border-slate-800 bg-slate-950/30">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        {ok ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-300" />
                        ) : (
                          <AlertTriangle className="w-4 h-4 text-yellow-300" />
                        )}
                        <div className="text-sm font-semibold text-white">{t.label}</div>
                      </div>
                      {t.note ? <div className="text-[11px] text-slate-400 mt-1">{t.note}</div> : null}
                      <div className="mt-2 text-[11px] font-mono text-slate-300 break-all">
                        {path ? path : <span className="text-slate-500">(not set)</span>}
                      </div>
                      {st.version ? (
                        <div className="mt-1 text-[10px] text-slate-400">Version: {st.version}</div>
                      ) : null}
                      {st.error ? (
                        <div className="mt-1 text-[10px] text-red-300">Error: {st.error}</div>
                      ) : null}
                    </div>

                    <div className="flex gap-2 shrink-0">
                      <button
                        onClick={() => setToolPath(t).catch(() => {})}
                        className="px-3 py-2 rounded bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-semibold flex items-center gap-2"
                      >
                        <FolderOpen className="w-4 h-4" /> Browse
                      </button>
                      <button
                        onClick={() => launchTool(t).catch(() => {})}
                        disabled={!path}
                        className="px-3 py-2 rounded bg-emerald-700 hover:bg-emerald-600 disabled:bg-slate-800 disabled:text-slate-500 border border-emerald-500 text-xs font-semibold flex items-center gap-2"
                      >
                        <Play className="w-4 h-4" /> Test Launch
                      </button>
                      <button
                        onClick={() => revealTool(t).catch(() => {})}
                        disabled={!path}
                        className="px-3 py-2 rounded bg-slate-800 hover:bg-slate-700 disabled:bg-slate-900 disabled:text-slate-600 border border-slate-700 text-xs font-semibold flex items-center gap-2"
                      >
                        <FolderOpen className="w-4 h-4" /> Reveal
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ToolVerify;
