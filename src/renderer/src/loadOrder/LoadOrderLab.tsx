import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FolderOpen, FileText, ArrowDownToLine, AlertTriangle, CheckCircle2, ExternalLink } from 'lucide-react';
import type { LoadOrderModel } from './types';
import { parseMo2Modlist, parseMo2PluginsTxt } from './parsers';
import { parseLootReport } from './loot';
import { generateXEditScriptStub } from './xedit';
import { parseArgs } from './args';

const getBridge = () => (window as any).electron?.api || (window as any).electronAPI;

const joinPath = (base: string, leaf: string) => {
  const trimmed = base.replace(/[\\/]+$/, '');
  return `${trimmed}\\${leaf}`;
};

export const LoadOrderLab: React.FC = () => {
  const navigate = useNavigate();
  const api = getBridge();

  const hasLoadedPersistedState = useRef(false);

  const [model, setModel] = useState<LoadOrderModel>({
    mods: [],
    plugins: [],
    lootDetectedPlugins: [],
  });

  const [status, setStatus] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [xeditPath, setXeditPath] = useState<string>('');
  const [preparedScriptPath, setPreparedScriptPath] = useState<string>('');
  const [xeditArgsEnabled, setXeditArgsEnabled] = useState<boolean>(false);
  const [xeditArgsTemplate, setXeditArgsTemplate] = useState<string>('');
  const [xeditPresetId, setXeditPresetId] = useState<string>('fo4edit-script-quoted');

  const xeditScript = useMemo(() => generateXEditScriptStub(model.plugins), [model.plugins]);

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const settings = await (window as any).electronAPI?.getSettings?.();
        const nextPath = String(settings?.xeditPath || '').trim();
        const persistedPreset = String(settings?.loadOrderLabXeditPresetId || '').trim();
        const persistedTemplate = String(settings?.loadOrderLabXeditArgsTemplate || '');
        const persistedEnabled = Boolean(settings?.loadOrderLabXeditArgsEnabled);
        const persistedPreparedScriptPath = String(settings?.loadOrderLabPreparedScriptPath || '').trim();

        setXeditPath(nextPath);
        if (persistedPreset) setXeditPresetId(persistedPreset);
        if (typeof persistedTemplate === 'string') setXeditArgsTemplate(persistedTemplate);
        setXeditArgsEnabled(persistedEnabled);
        if (persistedPreparedScriptPath) setPreparedScriptPath(persistedPreparedScriptPath);

        hasLoadedPersistedState.current = true;
      } catch {
        // ignore
      }
    };
    void loadSettings();

    try {
      (window as any).electronAPI?.onSettingsUpdated?.((settings: any) => {
        const nextPath = String(settings?.xeditPath || '').trim();
        setXeditPath(nextPath);
      });
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    if (!hasLoadedPersistedState.current) return;
    const api = (window as any).electronAPI;
    if (!api?.setSettings) return;

    const handle = window.setTimeout(() => {
      void api.setSettings({
        loadOrderLabXeditPresetId: xeditPresetId,
        loadOrderLabXeditArgsTemplate: xeditArgsTemplate,
        loadOrderLabXeditArgsEnabled: xeditArgsEnabled,
        loadOrderLabPreparedScriptPath: preparedScriptPath,
      });
    }, 400);

    return () => window.clearTimeout(handle);
  }, [xeditPresetId, xeditArgsTemplate, xeditArgsEnabled, preparedScriptPath]);

  const pickMo2Profile = async () => {
    setError('');
    setStatus('');
    try {
      if (!api?.pickMo2ProfileDir) {
        setError('Bridge does not support pickMo2ProfileDir yet.');
        return;
      }
      const dir = await api.pickMo2ProfileDir();
      if (!dir) return;

      setStatus('Reading MO2 profile...');
      const modlistPath = joinPath(dir, 'modlist.txt');
      const pluginsPath = joinPath(dir, 'plugins.txt');

      const [modlistRaw, pluginsRaw] = await Promise.all([
        api.readFile?.(modlistPath),
        api.readFile?.(pluginsPath),
      ]);

      const mods = parseMo2Modlist(String(modlistRaw || ''));
      const plugins = parseMo2PluginsTxt(String(pluginsRaw || ''));

      setModel(prev => ({
        ...prev,
        mo2ProfileDir: dir,
        mods,
        plugins,
      }));
      setStatus(`Loaded MO2 profile: ${plugins.length} plugins, ${mods.length} mods`);
    } catch (e: any) {
      setError(String(e?.message || e));
    }
  };

  const pickLootReport = async () => {
    setError('');
    setStatus('');
    try {
      if (!api?.pickLootReportFile) {
        setError('Bridge does not support pickLootReportFile yet.');
        return;
      }
      const file = await api.pickLootReportFile();
      if (!file) return;

      setStatus('Reading LOOT report...');
      const text = await api.readFile?.(file);
      const parsed = parseLootReport(file, String(text || ''));
      const detected = parsed.plugins;

      setModel(prev => ({
        ...prev,
        lootReportPath: file,
        lootDetectedPlugins: detected,
      }));
      setStatus(`Loaded LOOT report (${parsed.format}): detected ${detected.length} plugin references`);
    } catch (e: any) {
      setError(String(e?.message || e));
    }
  };

  const prepareXEditScriptInAppStorage = async () => {
    setError('');
    setStatus('');
    try {
      if (!api?.writeLoadOrderUserDataFile) {
        setError('Bridge does not support writeLoadOrderUserDataFile yet.');
        return;
      }
      const filename = 'mossy-xedit-conflict-patch-stub.pas';
      const outPath = await api.writeLoadOrderUserDataFile(filename, xeditScript);
      if (!outPath) {
        setError('Failed to write script into app storage.');
        return;
      }
      setPreparedScriptPath(outPath);
      setStatus(`Prepared script in app storage: ${outPath}`);
    } catch (e: any) {
      setError(String(e?.message || e));
    }
  };

  const openXEdit = async () => {
    setError('');
    setStatus('');
    try {
      const exe = (xeditPath || '').trim();
      if (!exe) {
        setError('xEdit path is not set. Configure it in Settings → Tools.');
        return;
      }
      if (!api?.openProgram) {
        setError('Bridge does not support openProgram on this build.');
        return;
      }
      const res = await api.openProgram(exe);
      if (!res?.success) {
        setError(res?.error || 'Failed to launch xEdit.');
        return;
      }
      setStatus('Launched xEdit. Use Apply Script and select the prepared script path shown below.');
    } catch (e: any) {
      setError(String(e?.message || e));
    }
  };

  const launchXEditWithArgs = async () => {
    setError('');
    setStatus('');
    try {
      if (!api?.launchXEdit) {
        setError('Bridge does not support launchXEdit on this build.');
        return;
      }

      // Ensure we have a stable script path on disk for template substitution.
      let scriptPath = preparedScriptPath;
      if (!scriptPath) {
        if (!api?.writeLoadOrderUserDataFile) {
          setError('Bridge does not support writeLoadOrderUserDataFile yet.');
          return;
        }
        scriptPath = await api.writeLoadOrderUserDataFile('mossy-xedit-conflict-patch-stub.pas', xeditScript);
        if (scriptPath) setPreparedScriptPath(scriptPath);
      }

      const template = (xeditArgsTemplate || '').trim();
      if (!template) {
        setError('Enter xEdit launch args first.');
        return;
      }

      const substituted = template
        .replaceAll('{scriptPath}', scriptPath || '')
        .replaceAll('{mo2ProfileDir}', model.mo2ProfileDir || '')
        .replaceAll('{lootReportPath}', model.lootReportPath || '');

      const args = parseArgs(substituted);
      const res = await api.launchXEdit(args);
      if (!res?.ok) {
        setError(res?.error || 'Failed to launch xEdit with args');
        return;
      }
      setStatus('Launched xEdit (detached) with your args.');
    } catch (e: any) {
      setError(String(e?.message || e));
    }
  };

  const xeditPresets = useMemo(() => {
    return [
      {
        id: 'manual',
        label: 'Manual (no args) — use Apply Script inside FO4Edit',
        template: '',
      },
      {
        id: 'fo4edit-script-quoted',
        label: 'FO4Edit: try -script:"{scriptPath}"',
        template: '-script:"{scriptPath}"',
      },
      {
        id: 'fo4edit-script-unquoted',
        label: 'FO4Edit: try -script:{scriptPath}',
        template: '-script:{scriptPath}',
      },
    ] as const;
  }, []);

  const applyPreset = (presetId: string) => {
    const preset = xeditPresets.find(p => p.id === presetId);
    setXeditPresetId(presetId);
    if (preset) setXeditArgsTemplate(preset.template);
  };

  const dryRunArgs = async () => {
    setError('');
    setStatus('');
    try {
      let scriptPath = preparedScriptPath;
      if (!scriptPath) {
        if (!api?.writeLoadOrderUserDataFile) {
          setError('Bridge does not support writeLoadOrderUserDataFile yet.');
          return;
        }
        scriptPath = await api.writeLoadOrderUserDataFile('mossy-xedit-conflict-patch-stub.pas', xeditScript);
        if (scriptPath) setPreparedScriptPath(scriptPath);
      }

      const template = (xeditArgsTemplate || '').trim();
      if (!template) {
        setStatus('Args template is empty (manual mode).');
        return;
      }

      const substituted = template
        .replaceAll('{scriptPath}', scriptPath || '')
        .replaceAll('{mo2ProfileDir}', model.mo2ProfileDir || '')
        .replaceAll('{lootReportPath}', model.lootReportPath || '');

      const args = parseArgs(substituted);
      setStatus(`Parsed args (${args.length}): ${JSON.stringify(args)}`);
    } catch (e: any) {
      setError(String(e?.message || e));
    }
  };

  const exportXEditCmdLauncher = async () => {
    setError('');
    setStatus('');
    try {
      const exe = (xeditPath || '').trim();
      if (!exe) {
        setError('xEdit path is not set. Configure it in Settings → Tools.');
        return;
      }
      if (!api?.saveFile) {
        setError('Bridge does not support saveFile export.');
        return;
      }
      const scriptPath = preparedScriptPath || (await api.writeLoadOrderUserDataFile?.('mossy-xedit-conflict-patch-stub.pas', xeditScript)) || '';
      if (!scriptPath) {
        setError('Could not prepare script path for launcher.');
        return;
      }
      setPreparedScriptPath(scriptPath);

      const cmd =
        `@echo off\r\n` +
        `echo Mossy Load Order Lab - xEdit Launcher\r\n` +
        `echo.\r\n` +
        `echo 1) In xEdit: right-click -> Apply Script\r\n` +
        `echo 2) Pick this script: ${scriptPath}\r\n` +
        `echo.\r\n` +
        `"${exe}"\r\n` +
        `pause\r\n`;

      const savedTo = await api.saveFile(cmd, 'run-xedit-mossy.cmd');
      if (savedTo) setStatus(`Saved launcher: ${savedTo}`);
    } catch (e: any) {
      setError(String(e?.message || e));
    }
  };

  const exportXEditScript = async () => {
    setError('');
    setStatus('');
    try {
      if (!api?.saveFile) {
        setError('Bridge does not support saveFile export.');
        return;
      }
      const filename = 'mossy-xedit-conflict-patch-stub.pas';
      const savedTo = await api.saveFile(xeditScript, filename);
      if (savedTo) setStatus(`Saved xEdit script: ${savedTo}`);
    } catch (e: any) {
      setError(String(e?.message || e));
    }
  };

  const enabledPlugins = model.plugins.filter(p => p.enabled);
  const disabledPlugins = model.plugins.filter(p => !p.enabled);

  return (
    <div className="h-full w-full overflow-hidden flex flex-col bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      <div className="p-5 border-b border-slate-700/60 bg-slate-900/40">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-slate-100">Load Order Lab (Experimental)</h1>
            <p className="text-xs text-slate-400 mt-1">
              MO2 + LOOT import, then generate an xEdit script stub.
            </p>
            <div className="mt-3 rounded border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-[11px] text-amber-200">
              The generated script is a stub placeholder. It only creates an empty patch and does not resolve conflicts for you.
            </div>
          </div>

          <div className="flex gap-2 flex-wrap justify-end">
            <button
              onClick={() => void pickMo2Profile()}
              className="px-3 py-2 rounded border border-slate-700 bg-slate-900/40 hover:border-slate-500 text-xs font-bold text-slate-200 flex items-center gap-2"
            >
              <FolderOpen className="w-4 h-4" />
              Pick MO2 Profile
            </button>
            <button
              onClick={() => void pickLootReport()}
              className="px-3 py-2 rounded border border-slate-700 bg-slate-900/40 hover:border-slate-500 text-xs font-bold text-slate-200 flex items-center gap-2"
            >
              <FileText className="w-4 h-4" />
              Import LOOT Report
            </button>
            <button
              onClick={() => void exportXEditScript()}
              className="px-3 py-2 rounded border border-emerald-700 bg-emerald-900/20 hover:border-emerald-500 text-xs font-bold text-emerald-200 flex items-center gap-2"
            >
              <ArrowDownToLine className="w-4 h-4" />
              Export xEdit Script
            </button>

            <button
              onClick={() => void prepareXEditScriptInAppStorage()}
              className="px-3 py-2 rounded border border-slate-700 bg-slate-900/40 hover:border-slate-500 text-xs font-bold text-slate-200"
              title="Writes the script into the app's userData folder (no dialog)"
            >
              Prepare Script (App Storage)
            </button>
            <button
              onClick={() => void openXEdit()}
              className="px-3 py-2 rounded border border-slate-700 bg-slate-900/40 hover:border-slate-500 text-xs font-bold text-slate-200 flex items-center gap-2"
            >
              <ExternalLink className="w-4 h-4" />
              Open xEdit
            </button>
            <button
              onClick={() => void exportXEditCmdLauncher()}
              className="px-3 py-2 rounded border border-slate-700 bg-slate-900/40 hover:border-slate-500 text-xs font-bold text-slate-200"
            >
              Export Launcher (.cmd)
            </button>
            <button
              onClick={() => navigate('/settings/tools')}
              className="px-3 py-2 rounded border border-slate-700 bg-slate-900/40 hover:border-slate-500 text-xs font-bold text-slate-200"
            >
              Settings → Tools
            </button>
          </div>
        </div>

        <div className="mt-3 grid grid-cols-3 gap-3 text-xs">
          <div className="rounded border border-slate-700 bg-slate-950/40 p-3">
            <div className="text-slate-400">MO2 profile</div>
            <div className="text-slate-200 mt-1 truncate">{model.mo2ProfileDir || '—'}</div>
          </div>
          <div className="rounded border border-slate-700 bg-slate-950/40 p-3">
            <div className="text-slate-400">LOOT report</div>
            <div className="text-slate-200 mt-1 truncate">{model.lootReportPath || '—'}</div>
          </div>
          <div className="rounded border border-slate-700 bg-slate-950/40 p-3">
            <div className="text-slate-400">Status</div>
            <div className="mt-1 flex items-center gap-2">
              {error ? (
                <>
                  <AlertTriangle className="w-4 h-4 text-red-400" />
                  <span className="text-red-300 truncate">{error}</span>
                </>
              ) : status ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span className="text-emerald-200 truncate">{status}</span>
                </>
              ) : (
                <span className="text-slate-500">—</span>
              )}
            </div>
          </div>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-3 text-xs">
          <div className="rounded border border-slate-700 bg-slate-950/40 p-3">
            <div className="text-slate-400">xEdit path (from settings)</div>
            <div className="text-slate-200 mt-1 truncate">{xeditPath || '—'}</div>
          </div>
          <div className="rounded border border-slate-700 bg-slate-950/40 p-3">
            <div className="text-slate-400">Prepared script path</div>
            <div className="text-slate-200 mt-1 truncate">{preparedScriptPath || '—'}</div>
          </div>
        </div>

        <div className="mt-3 rounded border border-slate-700 bg-slate-950/40 p-3 text-xs">
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="text-slate-200 font-bold">Advanced: xEdit auto-launch args</div>
              <div className="text-slate-400 mt-1">
                Variables: <span className="font-mono text-slate-300">{'{scriptPath}'}</span>, <span className="font-mono text-slate-300">{'{mo2ProfileDir}'}</span>, <span className="font-mono text-slate-300">{'{lootReportPath}'}</span>
              </div>
              <div className="text-slate-500 mt-1">
                Note: xEdit CLI flags differ by edition; this is user-controlled.
              </div>
            </div>

            <label className="flex items-center gap-2 text-slate-200">
              <input
                type="checkbox"
                checked={xeditArgsEnabled}
                onChange={(e) => setXeditArgsEnabled(e.target.checked)}
              />
              Enable
            </label>
          </div>

          {xeditArgsEnabled && (
            <div className="mt-3 space-y-2">
              <div className="flex items-center gap-2">
                <select
                  value={xeditPresetId}
                  onChange={(e) => applyPreset(e.target.value)}
                  className="px-3 py-2 rounded border border-slate-700 bg-slate-950/40 text-xs text-slate-200"
                  title="Presets are version-agnostic attempts; if they fail, use Manual."
                >
                  {xeditPresets.map(p => (
                    <option key={p.id} value={p.id}>{p.label}</option>
                  ))}
                </select>

                <button
                  onClick={() => void dryRunArgs()}
                  className="px-3 py-2 rounded border border-slate-700 bg-slate-900/40 hover:border-slate-500 text-xs font-bold text-slate-200"
                  title="Does not launch xEdit; shows how the app will split args"
                >
                  Show Parsed Args
                </button>
              </div>

              <div className="text-[11px] text-slate-400">
                If Launch w/ Args does nothing: switch to <span className="font-bold text-slate-300">Manual</span>, click <span className="font-bold text-slate-300">Prepare Script</span>, then in FO4Edit use <span className="font-bold text-slate-300">Apply Script</span> and browse to the prepared script path.
              </div>

              <div className="flex items-center gap-2">
                <input
                  value={xeditArgsTemplate}
                  onChange={(e) => setXeditArgsTemplate(e.target.value)}
                  placeholder={'Example: -script:"{scriptPath}"'}
                  className="flex-1 px-3 py-2 rounded border border-slate-700 bg-slate-950/40 text-[11px] font-mono text-slate-200"
                />
                <button
                  onClick={() => void launchXEditWithArgs()}
                  className="px-3 py-2 rounded border border-emerald-700 bg-emerald-900/20 hover:border-emerald-500 text-xs font-bold text-emerald-200"
                  title="Launches FO4Edit/xEdit detached using Settings → Tools xEdit path"
                >
                  Launch w/ Args
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-hidden grid grid-cols-2 gap-0">
        <div className="h-full overflow-hidden border-r border-slate-700/60">
          <div className="p-4 border-b border-slate-700/60 bg-slate-900/30">
            <div className="text-sm font-bold text-slate-100">MO2 Plugins</div>
            <div className="text-xs text-slate-400 mt-1">
              Enabled: {enabledPlugins.length} · Disabled: {disabledPlugins.length}
            </div>
          </div>
          <div className="h-full overflow-y-auto p-4 space-y-2">
            {model.plugins.length === 0 ? (
              <div className="text-xs text-slate-500">No plugins loaded yet.</div>
            ) : (
              model.plugins.map((p) => (
                <div key={p.name} className="flex items-center justify-between rounded border border-slate-800 bg-slate-950/40 px-3 py-2">
                  <div className="text-xs text-slate-200 font-mono truncate">{p.name}</div>
                  <div className={p.enabled ? 'text-[10px] font-bold text-emerald-300' : 'text-[10px] font-bold text-slate-500'}>
                    {p.enabled ? 'ENABLED' : 'disabled'}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="h-full overflow-hidden">
          <div className="p-4 border-b border-slate-700/60 bg-slate-900/30">
            <div className="text-sm font-bold text-slate-100">xEdit Script (Stub)</div>
            <div className="text-xs text-slate-400 mt-1">
              Export and run in xEdit as a starting point.
            </div>
          </div>
          <div className="h-full overflow-y-auto p-4">
            <textarea
              value={xeditScript}
              readOnly
              className="w-full h-[520px] resize-none rounded border border-slate-700 bg-slate-950/40 p-3 text-[11px] font-mono text-slate-200"
            />

            <div className="mt-4">
              <div className="text-xs font-bold text-slate-200">LOOT plugin mentions (heuristic)</div>
              <div className="text-[11px] text-slate-400 mt-1">Detected: {model.lootDetectedPlugins.length}</div>
              <div className="mt-2 max-h-52 overflow-y-auto space-y-1">
                {model.lootDetectedPlugins.length === 0 ? (
                  <div className="text-xs text-slate-500">No LOOT report imported yet.</div>
                ) : (
                  model.lootDetectedPlugins.map((name) => (
                    <div key={name} className="text-[11px] font-mono text-slate-300 rounded border border-slate-800 bg-slate-950/40 px-2 py-1">
                      {name}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
