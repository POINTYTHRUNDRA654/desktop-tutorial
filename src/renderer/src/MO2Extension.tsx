/**
 * MO2Extension — Mod Organizer 2 deep integration for MOSSY.SPACE
 *
 * Reads ModOrganizer.ini to locate the active profile, then parses:
 *   modlist.txt  — enabled/disabled mods with priority order
 *   plugins.txt  — load order (ESM / ESP / ESL)
 *   meta.ini     — per-mod metadata (version, category, Nexus ID)
 *
 * Supports profile switching, mod enable/disable toggle (writes modlist.txt),
 * live export, and a basic heuristic conflict detector.
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Package, List, Play, RefreshCw, AlertTriangle, CheckCircle2,
  Folder, Settings, FileText, Download, ChevronDown, ToggleLeft,
  ToggleRight, Search, Filter, BookOpen,
} from 'lucide-react';

// ─── Types ───────────────────────────────────────────────────────────────────

interface MO2Mod {
  name: string;
  enabled: boolean;
  priority: number;
  category?: string;
  version?: string;
  nexusId?: string;
  hasConflicts?: boolean;
  pluginType?: 'esm' | 'esl' | 'esp' | null;
}

interface MO2Profile {
  name: string;
  path: string;
  isActive: boolean;
}

interface MO2MetaData {
  gamePath?: string;
  modsPath?: string;
  downloadsPath?: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function decodeFileResult(result: any): string | null {
  if (typeof result === 'string') return result;
  if (result?.success && typeof result?.data === 'string') {
    try {
      const bytes = Uint8Array.from(atob(result.data), (c) => c.charCodeAt(0));
      return new TextDecoder().decode(bytes);
    } catch { return null; }
  }
  return null;
}

function parseIni(text: string): Record<string, string> {
  const map: Record<string, string> = {};
  for (const raw of text.split('\n')) {
    const line = raw.trim();
    if (!line || line.startsWith(';') || line.startsWith('#') || line.startsWith('[')) continue;
    const eq = line.indexOf('=');
    if (eq < 1) continue;
    map[line.slice(0, eq).trim()] = line.slice(eq + 1).trim();
  }
  return map;
}

function resolveProfileName(iniText: string): string {
  const byteArr = iniText.match(/selected_profile\s*=\s*@ByteArray\(([^)]+)\)/);
  if (byteArr) return byteArr[1].trim();
  const plain = iniText.match(/selected_profile\s*=\s*(.+)/);
  if (plain) return plain[1].trim();
  return 'Default';
}

const MO2_PATH_CANDIDATES = [
  'C:\\Modding\\MO2',
  'C:\\Modding\\Mod Organizer 2',
  'C:\\MO2',
  'C:\\Mod Organizer 2',
  'C:\\Program Files\\Mod Organizer 2',
  'C:\\Games\\MO2',
  'C:\\Games\\Mod Organizer 2',
  'D:\\Modding\\MO2',
  'D:\\Modding\\Mod Organizer 2',
  'D:\\MO2',
  'D:\\Games\\MO2',
];

const PLUGIN_TYPE_COLOR: Record<string, string> = {
  esm: 'bg-blue-900/40 text-blue-300 border-blue-500/30',
  esl: 'bg-purple-900/40 text-purple-300 border-purple-500/30',
  esp: 'bg-slate-700/60 text-slate-300 border-slate-600/30',
};

// ─── Component ───────────────────────────────────────────────────────────────

export const MO2Extension: React.FC = () => {
  const navigate = useNavigate();
  const [isConnected,    setIsConnected]    = useState(false);
  const [mo2Path,        setMo2Path]        = useState('');
  const [activeProfile,  setActiveProfile]  = useState<MO2Profile | null>(null);
  const [allProfiles,    setAllProfiles]    = useState<MO2Profile[]>([]);
  const [mods,           setMods]           = useState<MO2Mod[]>([]);
  const [loadOrder,      setLoadOrder]      = useState<string[]>([]);
  const [metaData,       setMetaData]       = useState<MO2MetaData>({});
  const [isScanning,     setIsScanning]     = useState(false);
  const [filterEnabled,  setFilterEnabled]  = useState<boolean | null>(null);
  const [filterConflict, setFilterConflict] = useState(false);
  const [searchQuery,    setSearchQuery]    = useState('');
  const [statusMsg,      setStatusMsg]      = useState('');
  const [statusError,    setStatusError]    = useState(false);
  const [profileOpen,    setProfileOpen]    = useState(false);
  const [togglingMod,    setTogglingMod]    = useState<string | null>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Check Neural Link every 5s for live MO2 detection
  useEffect(() => {
    const check = () => {
      try {
        const data = JSON.parse(localStorage.getItem('mossy_active_tools') || '{}');
        const running = data.tools?.some((t: any) =>
          t.name.toLowerCase().includes('modorganizer') || t.name.toLowerCase().includes('mo2')
        );
        if (running) setIsConnected(true);
      } catch { /* ignore */ }
    };
    check();
    const id = setInterval(check, 5000);
    return () => clearInterval(id);
  }, []);

  // ─── Core loader ─────────────────────────────────────────────────────────

  const loadMO2Config = useCallback(async (overridePath?: string, overrideProfile?: string) => {
    setIsScanning(true);
    setStatusMsg('');
    setStatusError(false);

    try {
      const bridge: any = (window as any).electron?.api || (window as any).electronAPI;

      // 1. Resolve MO2 root path
      let foundPath = overridePath || '';
      if (!foundPath) {
        const settings = await bridge?.getSettings?.().catch(() => null);
        foundPath = settings?.mo2Path || '';
      }

      if (!foundPath && bridge?.readFile) {
        // AppData paths are the most common for portable installs
        const appData = (window as any).__env?.APPDATA || '';
        const localAppData = (window as any).__env?.LOCALAPPDATA || '';
        const appDataCandidates = [
          appData     ? `${appData}\\ModOrganizer`      : '',
          localAppData ? `${localAppData}\\ModOrganizer` : '',
        ].filter(Boolean);

        for (const p of [...appDataCandidates, ...MO2_PATH_CANDIDATES]) {
          try {
            await bridge.readFile(`${p}\\ModOrganizer.ini`);
            foundPath = p;
            break;
          } catch { /* try next */ }
        }
      }

      if (!foundPath) {
        setStatusMsg('MO2 path not configured. Set it in Settings → External Tools, then click Refresh.');
        setStatusError(true);
        setIsScanning(false);
        return;
      }

      setMo2Path(foundPath);

      // 2. Parse ModOrganizer.ini
      let profileName  = overrideProfile || 'Default';
      let modsDir      = `${foundPath}\\mods`;
      let gameDir      = '';
      let downloadsDir = `${foundPath}\\downloads`;

      try {
        const iniText = decodeFileResult(await bridge.readFile(`${foundPath}\\ModOrganizer.ini`));
        if (iniText) {
          if (!overrideProfile) profileName = resolveProfileName(iniText);
          const ini = parseIni(iniText);
          if (ini['mod_directory'])       modsDir      = ini['mod_directory'].replace(/\//g, '\\');
          if (ini['base_directory'])      modsDir      = `${ini['base_directory']}\\mods`.replace(/\//g, '\\');
          if (ini['gamePath'])            gameDir      = ini['gamePath'].replace(/\//g, '\\');
          if (ini['download_directory'])  downloadsDir = ini['download_directory'].replace(/\//g, '\\');
        }
      } catch { /* fall back to defaults */ }

      setMetaData({ gamePath: gameDir || undefined, modsPath: modsDir, downloadsPath: downloadsDir });

      // 3. Enumerate profiles directory
      const profilesRoot = `${foundPath}\\profiles`;
      const detectedProfiles: MO2Profile[] = [];
      try {
        const entries: Array<{ name: string; type: string; path: string }> =
          (await bridge.browseDirectory?.(profilesRoot)) ?? [];
        for (const e of entries) {
          if (e.type === 'folder') {
            detectedProfiles.push({ name: e.name, path: e.path, isActive: e.name === profileName });
          }
        }
      } catch { /* fall back */ }

      if (detectedProfiles.length === 0) {
        detectedProfiles.push({ name: profileName, path: `${profilesRoot}\\${profileName}`, isActive: true });
      }
      setAllProfiles(detectedProfiles);

      const profilePath = (detectedProfiles.find((p) => p.isActive)?.path)
        ?? `${profilesRoot}\\${profileName}`;
      setActiveProfile({ name: profileName, path: profilePath, isActive: true });

      // 4. Parse modlist.txt
      const parsedMods: MO2Mod[] = [];
      try {
        const modlistText = decodeFileResult(await bridge.readFile(`${profilePath}\\modlist.txt`));
        if (modlistText) {
          modlistText
            .split('\n')
            .map((l: string) => l.trim())
            .filter((l: string) => l && !l.startsWith('#') && (l.startsWith('+') || l.startsWith('-')))
            .forEach((line: string, i: number) => {
              parsedMods.push({ name: line.slice(1).trim(), enabled: line.startsWith('+'), priority: i + 1 });
            });
        }
      } catch {
        setStatusMsg(`Could not read modlist.txt from profile "${profileName}".`);
        setStatusError(true);
      }

      // 5. Parse plugins.txt
      const parsedPlugins: string[] = [];
      try {
        const pluginsText = decodeFileResult(await bridge.readFile(`${profilePath}\\plugins.txt`));
        if (pluginsText) {
          pluginsText
            .split('\n')
            .map((l: string) => l.trim())
            .filter((l: string) => l && !l.startsWith('#'))
            .forEach((line: string) => {
              const plugin = line.startsWith('*') ? line.slice(1) : line;
              if (/\.(esp|esm|esl)$/i.test(plugin)) parsedPlugins.push(plugin);
            });
        }
      } catch { /* plugins.txt not critical */ }
      setLoadOrder(parsedPlugins);

      // 6. Enrich with meta.ini data (version, category, Nexus ID)
      const enrichedMods: MO2Mod[] = await Promise.all(
        parsedMods.map(async (mod) => {
          try {
            const metaText = decodeFileResult(
              await bridge.readFile(`${modsDir}\\${mod.name}\\meta.ini`)
            );
            if (metaText) {
              const ini = parseIni(metaText);
              return {
                ...mod,
                version:  ini['version']  || ini['Version']  || undefined,
                category: ini['category'] || ini['Category'] || undefined,
                nexusId:  ini['modid']    || ini['modId']    || undefined,
              };
            }
          } catch { /* separator / separator mods have no meta.ini */ }
          return mod;
        })
      );

      // 7. Conflict detection heuristic + plugin type tagging
      const pluginLower = parsedPlugins.map((p) => p.toLowerCase());
      const finalMods = enrichedMods.map((mod) => {
        const words = mod.name.toLowerCase().split(/[\s_-]+/).slice(0, 3).join(' ');
        const matchingPlugins = pluginLower.filter(
          (p) => p.includes(words) || words.includes(p.replace(/\.(esp|esm|esl)$/i, ''))
        );
        const ownPlugin = pluginLower.find((p) =>
          p.replace(/\.(esp|esm|esl)$/i, '').includes(words) ||
          words.includes(p.replace(/\.(esp|esm|esl)$/i, ''))
        );
        const pluginType = ownPlugin
          ? (ownPlugin.endsWith('.esm') ? 'esm' : ownPlugin.endsWith('.esl') ? 'esl' : 'esp')
          : null;
        return { ...mod, hasConflicts: matchingPlugins.length > 1, pluginType } as MO2Mod;
      });

      setMods(finalMods);
      setIsConnected(true);
    } catch (err) {
      console.error('[MO2Extension] load error:', err);
      setStatusMsg('Failed to read MO2 configuration. Verify the MO2 path in Settings → External Tools.');
      setStatusError(true);
    } finally {
      setIsScanning(false);
    }
  }, []);

  useEffect(() => { void loadMO2Config(); }, [loadMO2Config]);

  // ─── Profile switching ────────────────────────────────────────────────────

  const switchProfile = async (profile: MO2Profile) => {
    setProfileOpen(false);
    const bridge: any = (window as any).electron?.api || (window as any).electronAPI;
    try {
      const iniPath = `${mo2Path}\\ModOrganizer.ini`;
      let iniText = decodeFileResult(await bridge?.readFile?.(iniPath));
      if (iniText) {
        iniText = iniText
          .replace(/selected_profile\s*=\s*@ByteArray\([^)]+\)/, `selected_profile=@ByteArray(${profile.name})`)
          .replace(/selected_profile\s*=\s*(?!@ByteArray).+/, `selected_profile=${profile.name}`);
        await bridge?.writeFile?.(iniPath, iniText);
      }
    } catch { /* if write fails, reload with override anyway */ }
    await loadMO2Config(mo2Path, profile.name);
  };

  // ─── Toggle mod ──────────────────────────────────────────────────────────

  const toggleMod = async (modName: string) => {
    if (!activeProfile) return;
    const bridge: any = (window as any).electron?.api || (window as any).electronAPI;
    setTogglingMod(modName);
    try {
      const modlistPath = `${activeProfile.path}\\modlist.txt`;
      const raw = decodeFileResult(await bridge?.readFile?.(modlistPath));
      if (!raw) return;
      const updated = raw.split('\n').map((line) => {
        const t = line.trim();
        if ((!t.startsWith('+') && !t.startsWith('-')) || t.slice(1).trim() !== modName) return line;
        return (t.startsWith('+') ? '-' : '+') + modName;
      });
      await bridge?.writeFile?.(modlistPath, updated.join('\n'));
      setMods((prev) => prev.map((m) => m.name === modName ? { ...m, enabled: !m.enabled } : m));
    } catch {
      setStatusMsg('Could not write modlist.txt. Check file permissions.');
      setStatusError(true);
    } finally {
      setTogglingMod(null);
    }
  };

  // ─── Launch / Export ─────────────────────────────────────────────────────

  const launchMO2 = async () => {
    const bridge: any = (window as any).electron?.api;
    setStatusMsg('');
    try {
      const data = JSON.parse(localStorage.getItem('mossy_active_tools') || '{}');
      const mo2Tool = data?.tools?.find((t: any) =>
        t.name.toLowerCase().includes('modorganizer') || t.name.toLowerCase().includes('mo2')
      );
      if (mo2Tool?.path && bridge?.openProgram) {
        const r = await bridge.openProgram(mo2Tool.path);
        if (r?.success) { setStatusMsg('MO2 brought to focus.'); return; }
      }
      if (mo2Path && bridge?.openProgram) {
        const r = await bridge.openProgram(`${mo2Path}\\ModOrganizer.exe`);
        if (r?.success) { setStatusMsg('MO2 launched.'); return; }
      }
      setStatusMsg('MO2 not running — launch it from Windows first.');
    } catch { setStatusMsg('Could not launch MO2.'); }
  };

  const exportModList = async () => {
    const bridge: any = (window as any).electron?.api;
    if (!bridge?.saveFile) { setStatusMsg('Export not available.'); return; }
    const lines = [
      `# MO2 Mod List — Profile: ${activeProfile?.name ?? 'Unknown'}`,
      `# Exported: ${new Date().toLocaleString()}`,
      `# MO2 Path: ${mo2Path}`,
      '',
      `# ${mods.filter((m) => m.enabled).length} enabled / ${mods.length} total mods`,
      '',
      ...mods.map((m) =>
        `${m.enabled ? '[+]' : '[-]'} ${m.name}${m.version ? ` v${m.version}` : ''}${m.category ? ` (${m.category})` : ''}`
      ),
      '',
      '# Load Order (plugins.txt)',
      ...loadOrder.map((p, i) => `${String(i + 1).padStart(3, '0')} ${p}`),
    ];
    try {
      const savedTo = await bridge.saveFile(lines.join('\n'), 'mo2-mod-list.txt');
      if (savedTo) setStatusMsg(`Exported to: ${savedTo}`);
    } catch { setStatusMsg('Export failed.'); }
  };

  // ─── Derived ─────────────────────────────────────────────────────────────

  const filteredMods = mods.filter((m) => {
    if (filterEnabled !== null && m.enabled !== filterEnabled) return false;
    if (filterConflict && !m.hasConflicts) return false;
    if (searchQuery && !m.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  const enabledCount  = mods.filter((m) => m.enabled).length;
  const conflictCount = mods.filter((m) => m.hasConflicts).length;
  const eslCount      = loadOrder.filter((p) => /\.esl$/i.test(p)).length;
  const esmCount      = loadOrder.filter((p) => /\.esm$/i.test(p)).length;
  const espCount      = loadOrder.filter((p) => /\.esp$/i.test(p)).length;

  // ─── Render ──────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col h-full bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-6xl mx-auto space-y-5">

          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-white flex items-center gap-3">
                <Package className="w-6 h-6 text-purple-400" />
                Mod Organizer 2 Integration
              </h1>
              <p className="text-slate-400 mt-1 text-sm">Live profile viewer · mod toggle · load order · export</p>
            </div>
            <div className="flex items-center gap-2">
              <div className={`px-3 py-1.5 rounded-lg flex items-center gap-2 text-xs ${
                isConnected ? 'bg-green-900/30 border border-green-500/30 text-green-300' : 'bg-slate-800/50 border border-slate-700/50 text-slate-400'
              }`}>
                <div className={`w-1.5 h-1.5 rounded-full ${isConnected ? 'bg-green-400 animate-pulse' : 'bg-slate-500'}`} />
                {isConnected ? 'MO2 Connected' : 'Not Connected'}
              </div>
              <button
                onClick={() => void loadMO2Config(mo2Path || undefined)}
                disabled={isScanning}
                className="px-3 py-1.5 text-xs bg-purple-600/20 border border-purple-500/30 text-purple-200 rounded-lg hover:bg-purple-600/30 transition-colors flex items-center gap-1.5 disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isScanning ? 'animate-spin' : ''}`} />
                {isScanning ? 'Scanning…' : 'Refresh'}
              </button>
            </div>
          </div>

          {/* Error / Not connected */}
          {!isConnected && (
            <div className={`rounded-lg p-5 flex items-start gap-4 ${statusError ? 'bg-red-950/30 border border-red-500/30' : 'bg-amber-900/20 border border-amber-500/30'}`}>
              <AlertTriangle className={`w-5 h-5 flex-shrink-0 mt-0.5 ${statusError ? 'text-red-400' : 'text-amber-400'}`} />
              <div className="flex-1">
                <h3 className={`font-bold mb-1 text-sm ${statusError ? 'text-red-300' : 'text-amber-300'}`}>
                  {statusError ? 'Configuration Error' : 'MO2 Not Detected'}
                </h3>
                <p className="text-sm text-slate-300 mb-3">
                  {statusMsg || 'Set your MO2 path in Settings → External Tools, then click Refresh.'}
                </p>
                <div className="flex gap-2">
                  <button onClick={() => void loadMO2Config()} disabled={isScanning}
                    className="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2 disabled:opacity-50">
                    <RefreshCw className={`w-3.5 h-3.5 ${isScanning ? 'animate-spin' : ''}`} /> Retry
                  </button>
                  <button onClick={() => navigate('/settings')}
                    className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2">
                    <Settings className="w-3.5 h-3.5" /> Settings
                  </button>
                </div>
                <p className="text-xs text-slate-500 mt-2">
                  Reads: ModOrganizer.ini → profiles/{'{profile}'}/modlist.txt + plugins.txt + mods/{'{mod}'}/meta.ini
                </p>
              </div>
            </div>
          )}

          {/* Profile card + stats */}
          {isConnected && activeProfile && (
            <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 p-5">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <Folder className="w-5 h-5 text-purple-400 flex-shrink-0" />
                  <div ref={profileRef} className="relative">
                    <p className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold mb-0.5">Active Profile</p>
                    <button
                      onClick={() => allProfiles.length > 1 && setProfileOpen((v) => !v)}
                      className={`flex items-center gap-1.5 text-white font-semibold text-sm ${allProfiles.length > 1 ? 'hover:text-purple-300 cursor-pointer' : 'cursor-default'}`}
                    >
                      {activeProfile.name}
                      {allProfiles.length > 1 && <ChevronDown className="w-3.5 h-3.5 text-slate-400" />}
                    </button>
                    {profileOpen && (
                      <div className="absolute top-full left-0 z-50 mt-1 bg-slate-900 border border-slate-700 rounded-lg shadow-xl min-w-[200px]">
                        {allProfiles.map((p) => (
                          <button key={p.name} onClick={() => void switchProfile(p)}
                            className={`w-full text-left px-3 py-2 text-sm hover:bg-slate-800 transition-colors flex items-center gap-2 ${p.isActive ? 'text-purple-300' : 'text-slate-300'}`}>
                            {p.isActive ? <CheckCircle2 className="w-3.5 h-3.5 text-purple-400" /> : <div className="w-3.5 h-3.5" />}
                            {p.name}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                {statusMsg && (
                  <span className={`text-xs px-2.5 py-1 rounded ${statusError ? 'bg-red-900/30 text-red-300 border border-red-500/20' : 'bg-slate-900/70 text-slate-300 border border-slate-700'}`}>
                    {statusMsg}
                  </span>
                )}
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="bg-slate-900/60 rounded-lg p-3 border border-slate-700/40">
                  <div className="text-xl font-bold text-purple-400">{enabledCount}<span className="text-slate-500 text-sm">/{mods.length}</span></div>
                  <div className="text-xs text-slate-400 mt-0.5">Active Mods</div>
                </div>
                <div className="bg-slate-900/60 rounded-lg p-3 border border-slate-700/40">
                  <div className="text-xl font-bold text-blue-400">{loadOrder.length}</div>
                  <div className="text-xs text-slate-400 mt-0.5">Plugins</div>
                  <div className="text-[10px] text-slate-500">{esmCount} ESM · {eslCount} ESL · {espCount} ESP</div>
                </div>
                <div className="bg-slate-900/60 rounded-lg p-3 border border-slate-700/40">
                  <div className="text-xl font-bold text-amber-400">{conflictCount}</div>
                  <div className="text-xs text-slate-400 mt-0.5">Potential Conflicts</div>
                </div>
                <div className="bg-slate-900/60 rounded-lg p-3 border border-slate-700/40">
                  <div className="text-xl font-bold text-slate-300">{allProfiles.length}</div>
                  <div className="text-xs text-slate-400 mt-0.5">Profiles</div>
                </div>
              </div>

              {(metaData.gamePath || metaData.modsPath) && (
                <div className="mt-3 px-3 py-2 bg-slate-900/40 rounded border border-slate-800 text-xs text-slate-400 flex flex-wrap gap-x-4 gap-y-1">
                  {metaData.gamePath    && <span><span className="text-slate-500">Game:</span> {metaData.gamePath}</span>}
                  {metaData.modsPath    && <span><span className="text-slate-500">Mods:</span> {metaData.modsPath}</span>}
                  {metaData.downloadsPath && <span><span className="text-slate-500">Downloads:</span> {metaData.downloadsPath}</span>}
                </div>
              )}
            </div>
          )}

          {/* Quick Actions */}
          {isConnected && (
            <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 p-5">
              <h3 className="text-sm font-bold text-white mb-3">Quick Actions</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {[
                  { label: 'Launch MO2', icon: Play,     color: 'green', fn: launchMO2 },
                  { label: 'Settings',   icon: Settings, color: 'blue',  fn: () => navigate('/settings') },
                  { label: 'Game Logs',  icon: FileText, color: 'purple',fn: () => navigate('/diagnostics') },
                  { label: 'Export List',icon: Download, color: 'amber', fn: exportModList },
                ].map(({ label, icon: Icon, color, fn }) => (
                  <button key={label} onClick={() => void fn()}
                    className={`px-3 py-2.5 bg-${color}-900/20 border border-${color}-500/30 text-${color}-300 rounded-lg hover:bg-${color}-900/30 transition-colors flex items-center gap-2 justify-center text-sm`}>
                    <Icon className="w-4 h-4" /> {label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Mod List */}
          {isConnected && mods.length > 0 && (
            <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 p-5">
              <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <List className="w-4 h-4 text-purple-400" />
                  Mod List
                  <span className="text-xs text-slate-500 font-normal">({filteredMods.length} shown)</span>
                </h3>
                <div className="flex items-center gap-2 flex-wrap">
                  <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-500" />
                    <input type="text" placeholder="Search mods…" value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-7 pr-3 py-1.5 bg-slate-900/50 border border-slate-700 rounded-lg text-white text-xs w-40" />
                  </div>
                  <select value={filterEnabled === null ? 'all' : filterEnabled ? 'enabled' : 'disabled'}
                    onChange={(e) => setFilterEnabled(e.target.value === 'all' ? null : e.target.value === 'enabled')}
                    className="px-2.5 py-1.5 bg-slate-900/50 border border-slate-700 rounded-lg text-white text-xs">
                    <option value="all">All</option>
                    <option value="enabled">Enabled</option>
                    <option value="disabled">Disabled</option>
                  </select>
                  <button onClick={() => setFilterConflict((v) => !v)}
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs transition-colors ${filterConflict ? 'bg-amber-900/30 border-amber-500/40 text-amber-300' : 'bg-slate-900/50 border-slate-700 text-slate-400 hover:text-white'}`}>
                    <Filter className="w-3 h-3" /> Conflicts
                  </button>
                </div>
              </div>

              <div className="space-y-1 max-h-[420px] overflow-y-auto pr-1">
                {filteredMods.map((mod) => (
                  <div key={mod.name} className={`px-3 py-2.5 rounded-lg border transition-colors ${mod.enabled ? 'bg-slate-900/50 border-slate-700/50 hover:border-purple-500/30' : 'bg-slate-900/20 border-slate-800/40 opacity-55'}`}>
                    <div className="flex items-center gap-3">
                      <button onClick={() => void toggleMod(mod.name)} disabled={togglingMod === mod.name}
                        title={mod.enabled ? 'Disable mod' : 'Enable mod'}
                        className="flex-shrink-0 text-slate-500 hover:text-emerald-400 transition-colors disabled:opacity-40">
                        {mod.enabled ? <ToggleRight className="w-5 h-5 text-emerald-400" /> : <ToggleLeft className="w-5 h-5" />}
                      </button>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-white text-sm truncate">{mod.name}</span>
                          {mod.version && <span className="text-[10px] text-slate-400">v{mod.version}</span>}
                          {mod.pluginType && (
                            <span className={`text-[10px] px-1.5 rounded border font-semibold ${PLUGIN_TYPE_COLOR[mod.pluginType]}`}>
                              {mod.pluginType.toUpperCase()}
                            </span>
                          )}
                          {mod.hasConflicts && <AlertTriangle className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />}
                        </div>
                        <div className="flex items-center gap-3 mt-0.5">
                          <span className="text-[10px] text-slate-500">Priority #{mod.priority}</span>
                          {mod.category && <span className="text-[10px] px-1.5 bg-purple-900/30 text-purple-300 rounded border border-purple-500/20">{mod.category}</span>}
                          {mod.nexusId  && <span className="text-[10px] text-slate-600">NX#{mod.nexusId}</span>}
                        </div>
                      </div>
                      {mod.enabled ? <CheckCircle2 className="w-4 h-4 text-green-400 flex-shrink-0" /> : <div className="w-4 h-4 border-2 border-slate-600 rounded-full flex-shrink-0" />}
                    </div>
                  </div>
                ))}
                {filteredMods.length === 0 && (
                  <p className="text-center text-slate-500 text-sm py-8">No mods match the current filter.</p>
                )}
              </div>
            </div>
          )}

          {/* Load Order */}
          {isConnected && loadOrder.length > 0 && (
            <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 p-5">
              <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
                <List className="w-4 h-4 text-purple-400" />
                Plugin Load Order
                <span className="text-xs text-slate-500 font-normal">{loadOrder.length} plugins</span>
              </h3>
              <div className="space-y-1 max-h-[360px] overflow-y-auto pr-1">
                {loadOrder.map((plugin, i) => {
                  const ext = plugin.split('.').pop()?.toLowerCase() as 'esm' | 'esl' | 'esp';
                  return (
                    <div key={i} className="px-3 py-2 bg-slate-900/50 rounded-lg border border-slate-700/50 flex items-center gap-3">
                      <span className="text-[10px] font-mono text-slate-500 w-8 flex-shrink-0">{String(i + 1).padStart(3, '0')}</span>
                      <span className="text-sm text-white flex-1 truncate">{plugin}</span>
                      {ext && PLUGIN_TYPE_COLOR[ext] && (
                        <span className={`text-[10px] px-1.5 rounded border font-semibold flex-shrink-0 ${PLUGIN_TYPE_COLOR[ext]}`}>
                          {ext.toUpperCase()}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Reference card */}
          <div className="bg-slate-900/30 border border-slate-800 rounded-lg p-4 text-xs text-slate-400">
            <div className="flex items-center gap-2 mb-2">
              <BookOpen className="w-4 h-4 text-purple-400" />
              <span className="font-semibold text-slate-300">MO2 Integration — What Mossy Reads</span>
            </div>
            <div className="grid md:grid-cols-3 gap-3">
              <div><p className="text-slate-300 font-medium mb-1">ModOrganizer.ini</p><p>Active profile name, game path, mods directory, downloads directory.</p></div>
              <div><p className="text-slate-300 font-medium mb-1">modlist.txt</p><p>Enabled (+) / disabled (−) mods in priority order. Mossy can toggle mods and write changes back.</p></div>
              <div><p className="text-slate-300 font-medium mb-1">meta.ini (per mod)</p><p>Version, Nexus category, and mod ID scraped from MO2's per-mod metadata files.</p></div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};
