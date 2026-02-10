import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Save, TestTube2, Wrench, FileCog, Swords, Package, ExternalLink, Play, Palette, FolderOpen, ShieldCheck, Zap, Archive, Image as ImageIcon, Terminal, Maximize2, RefreshCw } from 'lucide-react';
import { executeMossyTool } from './MossyTools';
import type { Settings } from '../../shared/types';
import { ToolsInstallVerifyPanel } from './components/ToolsInstallVerifyPanel';

type ExternalToolsSettingsProps = {
  embedded?: boolean;
};

const ExternalToolsSettings: React.FC<ExternalToolsSettingsProps> = ({ embedded = false }) => {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [draft, setDraft] = useState<Partial<Settings>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const init = async () => {
      try {
        const s = await window.electronAPI.getSettings();
        setSettings(s);
        setDraft({
          xeditPath: s.xeditPath || '',
          xeditScriptsDirOverride: s.xeditScriptsDirOverride || '',
          nifSkopePath: s.nifSkopePath || '',
          fomodCreatorPath: s.fomodCreatorPath || '',
          creationKitPath: s.creationKitPath || '',
          fallout4Path: s.fallout4Path || '',
          papyrusCompilerPath: s.papyrusCompilerPath || '',
          papyrusFlagsPath: s.papyrusFlagsPath || '',
          papyrusImportPaths: s.papyrusImportPaths || '',
          papyrusSourcePath: s.papyrusSourcePath || '',
          papyrusOutputPath: s.papyrusOutputPath || '',
          blenderPath: s.blenderPath || '',
          lootPath: s.lootPath || '',
          vortexPath: s.vortexPath || '',
          mo2Path: s.mo2Path || '',
          wryeBashPath: s.wryeBashPath || '',
          bodySlidePath: s.bodySlidePath || '',
          outfitStudioPath: s.outfitStudioPath || '',
          baePath: s.baePath || '',
          gimpPath: s.gimpPath || '',
          archive2Path: s.archive2Path || '',
          pjmScriptPath: s.pjmScriptPath || '',
          f4sePath: s.f4sePath || '',
          upscaylPath: s.upscaylPath || '',
          photopeaPath: s.photopeaPath || '',
          shaderMapPath: s.shaderMapPath || '',
          nvidiaTextureToolsPath: s.nvidiaTextureToolsPath || '',
          autodeskFbxPath: s.autodeskFbxPath || '',
          photoDemonPath: s.photoDemonPath || '',
          unWrap3Path: s.unWrap3Path || '',
          nifUtilsSuitePath: s.nifUtilsSuitePath || '',
          nvidiaOmniversePath: s.nvidiaOmniversePath || '',
          spin3dPath: s.spin3dPath || '',
          nvidiaCanvasPath: s.nvidiaCanvasPath || '',
        });
      } catch (e) {
        console.warn('[ExternalToolsSettings] Failed to load settings', e);
      }
    };
    init();
  }, []);

  const handleChange = (key: keyof Settings, value: string) => {
    setDraft((prev: Partial<Settings>) => ({ ...prev, [key]: value }));
  };

  const save = async () => {
    setSaving(true);
    try {
      // Validate all paths before saving
      const issues: string[] = [];
      const toolNames: Record<string, string> = {
        xeditPath: 'xEdit',
        mo2Path: 'Mod Organizer 2',
        blenderPath: 'Blender',
        nifSkopePath: 'NifSkope',
        creationKitPath: 'Creation Kit',
        papyrusCompilerPath: 'Papyrus Compiler',
      };

      for (const [key, label] of Object.entries(toolNames)) {
        const path = (draft as any)[key];
        if (path && path.trim() !== '') {
          if (!path.toLowerCase().endsWith('.exe')) {
            issues.push(`${label}: Must be a .exe file (you have: ${path})`);
          }
        }
      }

      if (issues.length > 0) {
        alert(`❌ Configuration issues found:\n\n${issues.join('\n')}\n\nPlease fix these before saving.`);
        setSaving(false);
        return;
      }

      await window.electronAPI.setSettings(draft);
      const updated = await window.electronAPI.getSettings();
      setSettings(updated);
      
      // Broadcast settings update to all components
      window.dispatchEvent(new CustomEvent('mossy-settings-updated', { detail: updated }));
      console.log('[ExternalToolsSettings] Saved settings and broadcast update:', updated);
      
      alert("✅ [MOSSY] Configuration protocols updated, Architect. Your workspace is now synced with your external toolchain.");
    } catch (e) {
      console.error('Failed to save settings', e);
      alert(`❌ Failed to save settings: ${String(e)}`);
    } finally {
      setSaving(false);
    }
  };

  // Calls the same launch_tool Mossy uses for end-to-end parity
  const aiLaunchTest = async (toolId: string, label: string) => {
    try {
      console.log(`[AILaunchTest] Initiating for ${toolId}`);
      const res: any = await executeMossyTool('launch_tool', { toolId }, {
        isBlenderLinked: localStorage.getItem('mossy_blender_active') === 'true',
        setProfile: () => {},
        setProjectData: () => {},
        setProjectContext: () => {},
        setShowProjectPanel: () => {}
      });
      console.log('[AILaunchTest] Result:', res);
      const msg = typeof res?.result === 'string' ? res.result : JSON.stringify(res);
      if (res?.success === false) {
        alert(`❌ AI Launch failed for ${label}\n\n${res?.result || res?.error || 'Unknown error'}`);
      } else {
        alert(`✅ AI Launch executed for ${label}.\n\n${msg || 'Process initialized.'}`);
      }
    } catch (e) {
      console.error('[AILaunchTest] Exception', e);
      alert(`❌ AI Launch exception for ${label}:\n${String(e)}`);
    }
  };

  const testLaunch = async (path?: string, label?: string) => {
    console.log(`[TestLaunch] Called for ${label} with path:`, path);
    
    if (!path || path.trim() === '') {
      console.warn(`[TestLaunch] Path is empty for ${label}`);
      alert(`❌ No path configured for ${label || 'this tool'}.\n\nPlease:\n1. Click "Browse" to select the executable\n2. Click "Save Settings"\n3. Then try "Test Launch" again`);
      return;
    }

    console.log(`[TestLaunch] Path validation passed. Path length: ${path.length}`);
    
    try {
      const bridge = (window as any).electron?.api;
      console.log(`[TestLaunch] Bridge available?`, !!bridge);
      console.log(`[TestLaunch] openProgram available?`, !!bridge?.openProgram);
      
      if (bridge?.openProgram) {
        console.log(`[TestLaunch] Calling openProgram with:`, path);
        const result: any = await bridge.openProgram(path);
        console.log(`[TestLaunch] Result from openProgram:`, result);
        
        if (result && result.success === false) {
           const errorMsg = `❌ Could not launch ${label || 'tool'}:\n\n${result.error || 'Unknown error'}\n\nPath was: ${path}`;
           console.error(`[TestLaunch]`, errorMsg);
           alert(errorMsg);
        } else if (result && result.success === true) {
          const msg = `✅ Successfully launched ${label || 'tool'}!`;
          console.log(`[TestLaunch]`, msg);
          alert(msg);
        }
      } else if (bridge?.openExternal) {
        console.log(`[TestLaunch] Using openExternal fallback`);
        await bridge.openExternal(path);
      } else {
        console.error(`[TestLaunch] No bridge methods available`);
        alert('Launching external tools requires the Desktop Bridge (Electron).');
      }
    } catch (e) {
      console.error('[TestLaunch] Exception:', e);
      alert(`❌ Could not launch ${label || 'tool'}. Check the configured path: ${path}\n\nError: ${String(e)}`);
    }
  };

  const browsePath = async (toolKey: keyof Settings, toolName: string) => {
    console.log(`[BrowsePath] Opening file picker for ${toolName}`);
    try {
      const bridge = (window as any).electron?.api || (window as any).electronAPI;
      console.log(`[BrowsePath] Bridge available?`, !!bridge);
      console.log(`[BrowsePath] pickToolPath available?`, !!bridge?.pickToolPath);
      
      if (bridge?.pickToolPath) {
        console.log(`[BrowsePath] Calling pickToolPath...`);
        const selectedPath = await bridge.pickToolPath(toolName);
        console.log(`[BrowsePath] User selected:`, selectedPath);

        if (selectedPath) {
          console.log(`[BrowsePath] Checking if path ends with .exe:`, selectedPath.toLowerCase().endsWith('.exe'));

          // Validate that the selected path is an executable
          if (!selectedPath.toLowerCase().endsWith('.exe')) {
            const msg = `❌ Invalid selection.\n\nPlease select a .exe file.\n\nYou selected: ${selectedPath}`;
            console.error(`[BrowsePath]`, msg);
            alert(msg);
            return;
          }

          console.log(`[BrowsePath] Path validation passed. Saving: ${selectedPath}`);
          handleChange(toolKey, selectedPath);
        } else {
          console.log(`[BrowsePath] User cancelled file picker`);
        }
      } else {
        console.warn('[BrowsePath] File picker not available; offering manual fallback');
        const manualPath = prompt(`File picker unavailable.\n\nPlease paste the full path to ${toolName} (e.g., C:\\Program Files\\${toolName}\\${toolName}.exe)`);

        if (manualPath && manualPath.trim()) {
          if (manualPath.toLowerCase().endsWith('.exe')) {
            handleChange(toolKey, manualPath);
            alert(`✅ Path set to:\n${manualPath}`);
          } else {
            alert(`❌ Invalid path.\n\nMust be a .exe file.\n\nYou provided: ${manualPath}`);
          }
        }
      }
    } catch (e) {
      console.error('[BrowsePath] Exception:', e);
      const manualPath = prompt(`File picker failed: ${String(e)}\n\nPlease paste the full path to ${toolName}.exe`);
      if (manualPath && manualPath.trim()) {
        if (manualPath.toLowerCase().endsWith('.exe')) {
          handleChange(toolKey, manualPath);
          alert(`✅ Path set to:\n${manualPath}`);
        } else {
          alert(`❌ Invalid path.\n\nMust be a .exe file.`);
        }
      }
    }
  };

  const browseFolder = async (toolKey: keyof Settings, title: string) => {
    try {
      const bridge: any = (window as any).electron?.api || (window as any).electronAPI;
      if (typeof bridge?.pickDirectory === 'function') {
        const selected = await bridge.pickDirectory(title);
        if (selected) {
          handleChange(toolKey, String(selected));
        }
        return;
      }
      const manual = prompt(`Folder picker unavailable.\n\nPaste the full folder path for: ${title}`);
      if (manual && manual.trim()) {
        handleChange(toolKey, manual.trim());
      }
    } catch (e) {
      console.warn('[BrowseFolder] Failed:', e);
      const manual = prompt(`Folder picker failed: ${String(e)}\n\nPaste the full folder path for: ${title}`);
      if (manual && manual.trim()) {
        handleChange(toolKey, manual.trim());
      }
    }
  };

  const addCosmosKnowledgeRoot = async (defaultRoot: string, label: string) => {
    const ROOTS_KEY = 'mossy_knowledge_roots_v1';

    try {
      const api = (window as any).electron?.api || (window as any).electronAPI;
      let target = defaultRoot;

      if (api?.fsStat) {
        const status = await api.fsStat(defaultRoot);
        if (!status?.exists || !status?.isDirectory) {
          if (api?.pickDirectory) {
            const picked = await api.pickDirectory(`Select ${label} folder`);
            if (!picked) return;
            target = String(picked);
          } else {
            alert(`${label} folder not found. Please use Knowledge Search to add a root manually.`);
            return;
          }
        }
      }

      const raw = localStorage.getItem(ROOTS_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      const roots = Array.isArray(parsed) ? parsed : [];
      if (roots.includes(target)) {
        alert(`${label} is already in Knowledge Search roots.`);
        return;
      }

      localStorage.setItem(ROOTS_KEY, JSON.stringify([...roots, target]));
      alert(`Added ${label} to Knowledge Search roots.`);
    } catch (e) {
      console.warn('[ExternalToolsSettings] Failed to add knowledge root', e);
      alert('Failed to add Knowledge Search root.');
    }
  };

  const addKnowledgeRootFromPicker = async (label: string) => {
    const ROOTS_KEY = 'mossy_knowledge_roots_v1';

    try {
      const api = (window as any).electron?.api || (window as any).electronAPI;
      if (!api?.pickDirectory) {
        alert('Folder picker not available. Add a root manually in Knowledge Search.');
        return;
      }

      const picked = await api.pickDirectory(`Select ${label} folder`);
      if (!picked) return;
      const target = String(picked);

      const raw = localStorage.getItem(ROOTS_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      const roots = Array.isArray(parsed) ? parsed : [];
      if (roots.includes(target)) {
        alert(`${label} is already in Knowledge Search roots.`);
        return;
      }

      localStorage.setItem(ROOTS_KEY, JSON.stringify([...roots, target]));
      alert(`Added ${label} to Knowledge Search roots.`);
    } catch (e) {
      console.warn('[ExternalToolsSettings] Failed to add knowledge root (picker)', e);
      alert('Failed to add Knowledge Search root.');
    }
  };

  const autoDetect = () => {
    try {
        const appsRaw = localStorage.getItem('mossy_apps');
        if (!appsRaw) {
            alert("No scan data found. Please run a 'Full System Scan' in the System Monitor first.");
            return;
        }
        
        const apps = JSON.parse(appsRaw);
        const newDraft = { ...draft };
        let foundCount = 0;

        const mappings: Record<string, keyof Settings> = {
            'blender': 'blenderPath',
            'creation kit': 'creationKitPath',
            'creationkit': 'creationKitPath',
            'fo4edit': 'xeditPath',
            'xedit': 'xeditPath',
            'nifskope': 'nifSkopePath',
            'vortex': 'vortexPath',
            'mod organizer': 'mo2Path',
            'bodySlide': 'bodySlidePath',
            'outfit studio': 'bodySlidePath',
            'f4se': 'f4sePath',
            'loot': 'lootPath',
            'gimp': 'gimpPath',
            'upscayl': 'upscaylPath',
            'photopea': 'photopeaPath',
            'shadermap': 'shaderMapPath',
            'nvidia texture tools': 'nvidiaTextureToolsPath',
            'fbx converter': 'autodeskFbxPath',
            'photodemon': 'photoDemonPath',
            'unwrap3': 'unWrap3Path',
            'nifutils': 'nifUtilsSuitePath',
            'omniverse': 'nvidiaOmniversePath',
            'spin3d': 'spin3dPath',
            'nvidia canvas': 'nvidiaCanvasPath',
            'canvas': 'nvidiaCanvasPath',
            'vita': 'nvidiaCanvasPath',
            'vita canvas': 'nvidiaCanvasPath'
        };

        console.log('[ExternalToolsSettings] Auto-detect: Loaded', apps.length, 'apps from localStorage');
        console.log('[ExternalToolsSettings] First 3 apps structure:', JSON.stringify(apps.slice(0, 3), null, 2));

        apps.forEach((app: any) => {
            // Match by displayName or name
            const appName = (app.displayName || app.name || '').toLowerCase();
            
            // Try to use app.path if available; otherwise skip (can't auto-set without a path)
            if (!app.path || typeof app.path !== 'string') {
                if (appName) console.log('[ExternalToolsSettings] Skipping', appName, '(no valid path)');
                return;
            }
            
            // Accept .exe or direct folder paths (for portables)
            const pathLower = app.path.toLowerCase();
            const isExePath = pathLower.endsWith('.exe');
            if (!isExePath) {
                if (appName) console.log('[ExternalToolsSettings] Skipping', appName, '(not an .exe):', app.path);
                return;
            }
            
            // Extract exe filename without extension (e.g., "blender.exe" -> "blender")
            const exeBasename = app.path.split('\\').pop()?.split('/').pop()?.toLowerCase().replace(/\.exe$/, '') || '';
            
            // Log every app with valid path for inspection
            console.log('[ExternalToolsSettings] Checking app:', { name: appName, exe: exeBasename, path: app.path });
            
            // Try matching against appName first, then exeBasename
            let matched = false;
            for (const [key, field] of Object.entries(mappings)) {
                if (appName.includes(key) || exeBasename.includes(key)) {
                    console.log('[ExternalToolsSettings]   ✓ MATCHED "' + key + '" → ' + field);
                    newDraft[field] = app.path;
                    foundCount++;
                    matched = true;
                    break;
                }
            }
            if (!matched) {
                console.log('[ExternalToolsSettings]   No mapping matched for:', appName || exeBasename);
            }
        });

        setDraft(newDraft);
        console.log('[ExternalToolsSettings] Auto-detect complete: found', foundCount, 'tools');
        
        if (foundCount > 0) {
            alert(`Auto-detected ${foundCount} tools from your recent system scan. Don't forget to Save!`);
        } else {
            alert(`No matching tools found (scanned ${apps.length} programs). You may need to set them manually.`);
        }
    } catch (e) {
        console.error('[ExternalToolsSettings] Auto-detect error:', e);
        alert("Error during auto-detection: " + String(e));
    }
  };

  const getPathStatusStyle = (path?: string) => {
    if (!path || path.trim() === '') {
      return 'bg-red-950 border-red-700 text-slate-400';
    }
    return 'bg-slate-800 border-emerald-600 text-white';
  };

  const getPathStatusIcon = (path?: string) => {
    if (!path || path.trim() === '') {
      return '⚠️ NOT SET';
    }
    return '✅ CONFIGURED';
  };

  const containerClassName = embedded
    ? 'flex flex-col bg-[#0d1117] text-slate-200 font-sans'
    : 'h-full flex flex-col bg-[#0d1117] text-slate-200 font-sans overflow-hidden';

  const contentClassName = embedded ? 'p-4' : 'flex-1 overflow-auto p-6';

  return (
    <div className={containerClassName}>
      {!embedded && (
        <div className="p-4 border-b border-slate-700 bg-slate-900 flex justify-between items-center z-10 shadow-md">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-3">
              <Wrench className="w-6 h-6 text-emerald-400" /> External Tools Settings
            </h2>
            <p className="text-xs text-slate-400 font-mono mt-1">Configure paths to common modding tools</p>
          </div>
          <div className="flex gap-2">
            <Link
              to="/reference"
              className="px-3 py-2 text-[10px] font-black uppercase tracking-widest rounded bg-emerald-900/20 border border-emerald-500/30 text-emerald-100 hover:bg-emerald-900/30 transition-colors"
              title="Open help"
            >
              Help
            </Link>
            <button onClick={autoDetect} className="px-4 py-2 bg-purple-900/40 hover:bg-purple-800/60 border border-purple-500 rounded text-xs font-bold flex items-center gap-2 transition-all">
              <Zap className="w-4 h-4" /> Auto-Detect from Scan
            </button>
            <button onClick={save} disabled={saving} className="px-4 py-2 bg-emerald-700 hover:bg-emerald-600 border border-emerald-500 rounded text-xs font-bold flex items-center gap-2 transition-all disabled:opacity-50">
              <Save className="w-4 h-4" /> Save Settings
            </button>
          </div>
        </div>
      )}

      <div className={contentClassName}>
        {embedded && (
          <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Wrench className="w-5 h-5 text-emerald-400" /> External Tools Settings
              </h2>
              <p className="text-xs text-slate-400 font-mono mt-1">Configure paths to common modding tools</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={autoDetect}
                className="px-3 py-2 bg-purple-900/40 hover:bg-purple-800/60 border border-purple-500 rounded text-xs font-bold flex items-center gap-2 transition-all"
              >
                <Zap className="w-4 h-4" /> Auto-Detect from Scan
              </button>
              <button
                onClick={save}
                disabled={saving}
                className="px-3 py-2 bg-emerald-700 hover:bg-emerald-600 border border-emerald-500 rounded text-xs font-bold flex items-center gap-2 transition-all disabled:opacity-50"
              >
                <Save className="w-4 h-4" /> Save Settings
              </button>
            </div>
          </div>
        )}
        <ToolsInstallVerifyPanel
          accentClassName="text-emerald-300"
          description="Use this page to point Mossy at the tools you already have installed. The app does not bundle these executables for you."
          verify={[
            'Pick one tool (e.g., xEdit) → Browse to its .exe → confirm status flips to “✅ CONFIGURED”.',
            'Click Save Settings and confirm a success message.',
            'Use Test Launch (or AI Launch Test) to confirm the tool can be started from Mossy.'
          ]}
          firstTestLoop={[
            'Auto-detect from scan (if available) → review each detected path.',
            'Save → test-launch your top 1–2 tools (xEdit, Blender, Creation Kit).',
            'Return to Workshop/Assembler and confirm those pages stop warning about missing tools.'
          ]}
          troubleshooting={[
            'If Browse/Test Launch does nothing, you may be missing the desktop bridge; use the packaged Electron app.',
            'If Save warns about file type, ensure you selected the tool’s .exe (not a folder or shortcut).' 
          ]}
        />

        <div className="mb-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 bg-slate-900 border border-slate-800 rounded-lg">
            <div className="text-sm font-bold text-white mb-2">Cosmos Transfer2.5 (Local Repo)</div>
            <div className="text-xs text-slate-300 mb-3">
              Adds the local Cosmos Transfer2.5 repo to Knowledge Search so you can index and query its docs.
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => addCosmosKnowledgeRoot('external/nvidia-cosmos/cosmos-transfer2.5', 'Cosmos Transfer2.5')}
                className="px-3 py-2 bg-emerald-700 hover:bg-emerald-600 border border-emerald-500 rounded text-[11px] font-bold"
              >
                Add to Knowledge Search Roots
              </button>
            </div>
            <div className="mt-2 text-[10px] text-slate-500">
              Default path: external/nvidia-cosmos/cosmos-transfer2.5
            </div>
          </div>

          <div className="p-4 bg-slate-900 border border-slate-800 rounded-lg">
            <div className="text-sm font-bold text-white mb-2">Cosmos Predict2.5 (Local Repo)</div>
            <div className="text-xs text-slate-300 mb-3">
              Adds the local Cosmos Predict2.5 repo to Knowledge Search so you can index and query its docs.
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => addCosmosKnowledgeRoot('external/nvidia-cosmos/cosmos-predict2.5', 'Cosmos Predict2.5')}
                className="px-3 py-2 bg-emerald-700 hover:bg-emerald-600 border border-emerald-500 rounded text-[11px] font-bold"
              >
                Add to Knowledge Search Roots
              </button>
            </div>
            <div className="mt-2 text-[10px] text-slate-500">
              Default path: external/nvidia-cosmos/cosmos-predict2.5
            </div>
          </div>

          <div className="p-4 bg-slate-900 border border-slate-800 rounded-lg">
            <div className="text-sm font-bold text-white mb-2">Cosmos Cookbook (Local Repo)</div>
            <div className="text-xs text-slate-300 mb-3">
              Adds the local Cosmos Cookbook repo to Knowledge Search so you can index and query its docs.
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => addCosmosKnowledgeRoot('external/nvidia-cosmos/cosmos-cookbook', 'Cosmos Cookbook')}
                className="px-3 py-2 bg-emerald-700 hover:bg-emerald-600 border border-emerald-500 rounded text-[11px] font-bold"
              >
                Add to Knowledge Search Roots
              </button>
            </div>
            <div className="mt-2 text-[10px] text-slate-500">
              Default path: external/nvidia-cosmos/cosmos-cookbook
            </div>
          </div>

          <div className="p-4 bg-slate-900 border border-slate-800 rounded-lg">
            <div className="text-sm font-bold text-white mb-2">Cosmos RL (Local Repo)</div>
            <div className="text-xs text-slate-300 mb-3">
              Adds the local Cosmos RL repo to Knowledge Search so you can index and query its docs.
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => addCosmosKnowledgeRoot('external/nvidia-cosmos/cosmos-rl', 'Cosmos RL')}
                className="px-3 py-2 bg-emerald-700 hover:bg-emerald-600 border border-emerald-500 rounded text-[11px] font-bold"
              >
                Add to Knowledge Search Roots
              </button>
            </div>
            <div className="mt-2 text-[10px] text-slate-500">
              Default path: external/nvidia-cosmos/cosmos-rl
            </div>
          </div>

          <div className="p-4 bg-slate-900 border border-slate-800 rounded-lg">
            <div className="text-sm font-bold text-white mb-2">Cosmos Dependencies (Local Repo)</div>
            <div className="text-xs text-slate-300 mb-3">
              Adds the local Cosmos Dependencies repo to Knowledge Search so you can index and query its docs.
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => addCosmosKnowledgeRoot('external/nvidia-cosmos/cosmos-dependencies', 'Cosmos Dependencies')}
                className="px-3 py-2 bg-emerald-700 hover:bg-emerald-600 border border-emerald-500 rounded text-[11px] font-bold"
              >
                Add to Knowledge Search Roots
              </button>
            </div>
            <div className="mt-2 text-[10px] text-slate-500">
              Default path: external/nvidia-cosmos/cosmos-dependencies
            </div>
          </div>

          <div className="p-4 bg-slate-900 border border-slate-800 rounded-lg">
            <div className="text-sm font-bold text-white mb-2">Cosmos Curate (Local Repo)</div>
            <div className="text-xs text-slate-300 mb-3">
              Adds the local Cosmos Curate repo to Knowledge Search so you can index and query its docs.
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => addCosmosKnowledgeRoot('external/nvidia-cosmos/cosmos-curate', 'Cosmos Curate')}
                className="px-3 py-2 bg-emerald-700 hover:bg-emerald-600 border border-emerald-500 rounded text-[11px] font-bold"
              >
                Add to Knowledge Search Roots
              </button>
            </div>
            <div className="mt-2 text-[10px] text-slate-500">
              Default path: external/nvidia-cosmos/cosmos-curate
            </div>
          </div>

          <div className="p-4 bg-slate-900 border border-slate-800 rounded-lg">
            <div className="text-sm font-bold text-white mb-2">Cosmos Xenna (Local Repo)</div>
            <div className="text-xs text-slate-300 mb-3">
              Adds the local Cosmos Xenna repo to Knowledge Search so you can index and query its docs.
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => addCosmosKnowledgeRoot('external/nvidia-cosmos/cosmos-xenna', 'Cosmos Xenna')}
                className="px-3 py-2 bg-emerald-700 hover:bg-emerald-600 border border-emerald-500 rounded text-[11px] font-bold"
              >
                Add to Knowledge Search Roots
              </button>
            </div>
            <div className="mt-2 text-[10px] text-slate-500">
              Default path: external/nvidia-cosmos/cosmos-xenna
            </div>
          </div>

          <div className="p-4 bg-slate-900 border border-slate-800 rounded-lg">
            <div className="text-sm font-bold text-white mb-2">Fallout 4 Working Folder (Local)</div>
            <div className="text-xs text-slate-300 mb-3">
              Adds your local Fallout 4 working folder to Knowledge Search for private, on-device indexing.
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => addKnowledgeRootFromPicker('Fallout 4 Working Folder')}
                className="px-3 py-2 bg-emerald-700 hover:bg-emerald-600 border border-emerald-500 rounded text-[11px] font-bold"
              >
                Add via Folder Picker
              </button>
            </div>
            <div className="mt-2 text-[10px] text-slate-500">
              Each user picks their own folder path (not shared or synced).
            </div>
          </div>
        </div>

        <div className="mb-6 p-4 bg-blue-900/30 border border-blue-700 rounded-lg text-sm text-blue-300">
          <strong>📌 Quick Start:</strong> Each tool below shows its configuration status (✅ CONFIGURED or ⚠️ NOT SET). 
          <ol className="mt-2 ml-4 space-y-1 list-decimal">
            <li>Click <strong>Browse</strong> next to any tool to select its executable</li>
            <li>Click <strong>Save Settings</strong> to save your configuration</li>
            <li>Use <strong>Test Launch</strong> to verify the tool launches correctly</li>
          </ol>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* xEdit / FO4Edit */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Swords className="w-5 h-5 text-emerald-400" />
            <div>
              <div className="text-sm font-bold text-white flex items-center gap-2">
                xEdit / FO4Edit
                <span className={`text-[10px] px-2 py-0.5 rounded font-mono ${draft.xeditPath ? 'bg-green-900 text-green-300' : 'bg-red-900 text-red-300'}`}>
                  {getPathStatusIcon(draft.xeditPath)}
                </span>
              </div>
              <a href="https://www.nexusmods.com/fallout4/mods/2737" target="_blank" rel="noreferrer" className="text-[11px] text-blue-400 hover:text-blue-300 inline-flex items-center gap-1"><ExternalLink className="w-3 h-3" /> Download from Nexus Mods</a>
            </div>
          </div>
          <input value={draft.xeditPath || ''} onChange={(e) => handleChange('xeditPath', e.target.value)} placeholder="Click Browse to select FO4Edit.exe" title={draft.xeditPath || 'No path configured'} className={`w-full rounded px-3 py-2 text-xs border font-mono ${getPathStatusStyle(draft.xeditPath)}`} />
          {draft.xeditPath && <div className="mt-1 text-[10px] text-slate-500 font-mono break-all">📁 {draft.xeditPath}</div>}
          <div className="mt-2 flex gap-2">
            <button onClick={() => browsePath('xeditPath', 'xEdit')} className="px-3 py-1 bg-slate-700 hover:bg-slate-600 border border-slate-600 rounded text-[11px] font-bold flex items-center gap-1"><FolderOpen className="w-3 h-3" /> Browse</button>
            <button onClick={() => testLaunch(draft.xeditPath, 'xEdit')} className="px-3 py-1 bg-emerald-700 hover:bg-emerald-600 border border-emerald-500 rounded text-[11px] font-bold flex items-center gap-1"><Play className="w-3 h-3" /> Test Launch</button>
            <button onClick={() => aiLaunchTest('xedit', 'xEdit')} className="px-3 py-1 bg-sky-700 hover:bg-sky-600 border border-sky-500 rounded text-[11px] font-bold flex items-center gap-1"><Zap className="w-3 h-3" /> AI Launch Test</button>
          </div>

          <div className="mt-3 pt-3 border-t border-slate-800">
            <div className="text-[11px] text-slate-400 mb-1">Optional: xEdit “Edit Scripts” folder override</div>
            <input
              value={(draft as any).xeditScriptsDirOverride || ''}
              onChange={(e) => handleChange('xeditScriptsDirOverride', e.target.value)}
              placeholder="(auto) next to FO4Edit.exe\\Edit Scripts"
              className="w-full rounded px-3 py-2 text-xs border font-mono bg-slate-800 border-slate-700 text-white"
            />
            <div className="mt-2 flex gap-2">
              <button
                onClick={() => browseFolder('xeditScriptsDirOverride', 'Select xEdit Edit Scripts folder')}
                className="px-3 py-1 bg-slate-700 hover:bg-slate-600 border border-slate-600 rounded text-[11px] font-bold flex items-center gap-1"
              >
                <FolderOpen className="w-3 h-3" /> Browse Folder
              </button>
              <button
                onClick={() => handleChange('xeditScriptsDirOverride', '')}
                className="px-3 py-1 bg-slate-900 hover:bg-slate-800 border border-slate-700 rounded text-[11px] font-bold"
                title="Clear override (use auto-detected folder)"
              >
                Clear
              </button>
            </div>
            <div className="mt-2 text-[10px] text-slate-500">
              Use this if your xEdit scripts folder isn’t next to the .exe (MO2, portable setups, custom layouts).
            </div>
          </div>
        </div>

        {/* NifSkope */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <FileCog className="w-5 h-5 text-purple-400" />
            <div>
              <div className="text-sm font-bold text-white">NifSkope</div>
              <a href="https://www.nexusmods.com/newvegas/mods/75969" target="_blank" rel="noreferrer" className="text-[11px] text-blue-400 hover:text-blue-300 inline-flex items-center gap-1"><ExternalLink className="w-3 h-3" /> Download from Nexus Mods</a>
            </div>
          </div>
          <input value={draft.nifSkopePath || ''} onChange={(e) => handleChange('nifSkopePath', e.target.value)} placeholder="C:\\Path\\To\\NifSkope.exe" className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-sm text-white" />
          <div className="mt-2 flex gap-2">
            <button onClick={() => browsePath('nifSkopePath', 'NifSkope')} className="px-3 py-1 bg-slate-700 hover:bg-slate-600 border border-slate-600 rounded text-[11px] font-bold flex items-center gap-1"><FolderOpen className="w-3 h-3" /> Browse</button>
            <button onClick={() => testLaunch(draft.nifSkopePath, 'NifSkope')} className="px-3 py-1 bg-emerald-700 hover:bg-emerald-600 border border-emerald-500 rounded text-[11px] font-bold flex items-center gap-1"><Play className="w-3 h-3" /> Test Launch</button>
            <button onClick={() => aiLaunchTest('nifskope', 'NifSkope')} className="px-3 py-1 bg-sky-700 hover:bg-sky-600 border border-sky-500 rounded text-[11px] font-bold flex items-center gap-1"><Zap className="w-3 h-3" /> AI Launch Test</button>
          </div>
        </div>

        {/* FOMOD Creator */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Package className="w-5 h-5 text-blue-400" />
            <div>
              <div className="text-sm font-bold text-white">FOMOD Creation Tool</div>
              <a href="https://www.nexusmods.com/fallout4/mods/6821" target="_blank" rel="noreferrer" className="text-[11px] text-blue-400 hover:text-blue-300 inline-flex items-center gap-1"><ExternalLink className="w-3 h-3" /> Download from Nexus Mods</a>
            </div>
          </div>
          <input value={draft.fomodCreatorPath || ''} onChange={(e) => handleChange('fomodCreatorPath', e.target.value)} placeholder="C:\\Path\\To\\FomodDesigner.exe" className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-sm text-white" />
          <div className="mt-2 flex gap-2">
            <button onClick={() => browsePath('fomodCreatorPath', 'FOMOD Creator')} className="px-3 py-1 bg-slate-700 hover:bg-slate-600 border border-slate-600 rounded text-[11px] font-bold flex items-center gap-1"><FolderOpen className="w-3 h-3" /> Browse</button>
            <button onClick={() => testLaunch(draft.fomodCreatorPath, 'FOMOD Creator')} className="px-3 py-1 bg-emerald-700 hover:bg-emerald-600 border border-emerald-500 rounded text-[11px] font-bold flex items-center gap-1"><Play className="w-3 h-3" /> Test Launch</button>
            <button onClick={() => aiLaunchTest('fomodcreator', 'FOMOD Creator')} className="px-3 py-1 bg-sky-700 hover:bg-sky-600 border border-sky-500 rounded text-[11px] font-bold flex items-center gap-1"><Zap className="w-3 h-3" /> AI Launch Test</button>
          </div>
        </div>

        {/* Creation Kit */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Wrench className="w-5 h-5 text-amber-400" />
            <div>
              <div className="text-sm font-bold text-white">Creation Kit</div>
              <span className="text-[11px] text-slate-400">Available via Bethesda.net launcher / Steam tools</span>
            </div>
          </div>
          <input value={draft.creationKitPath || ''} onChange={(e) => handleChange('creationKitPath', e.target.value)} placeholder="C:\\Path\\To\\CreationKit.exe" className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-sm text-white" />
          <div className="mt-2 flex gap-2">
            <button onClick={() => browsePath('creationKitPath', 'Creation Kit')} className="px-3 py-1 bg-slate-700 hover:bg-slate-600 border border-slate-600 rounded text-[11px] font-bold flex items-center gap-1"><FolderOpen className="w-3 h-3" /> Browse</button>
            <button onClick={() => testLaunch(draft.creationKitPath, 'Creation Kit')} className="px-3 py-1 bg-emerald-700 hover:bg-emerald-600 border border-emerald-500 rounded text-[11px] font-bold flex items-center gap-1"><Play className="w-3 h-3" /> Test Launch</button>
            <button onClick={() => aiLaunchTest('creationkit', 'Creation Kit')} className="px-3 py-1 bg-sky-700 hover:bg-sky-600 border border-sky-500 rounded text-[11px] font-bold flex items-center gap-1"><Zap className="w-3 h-3" /> AI Launch Test</button>
          </div>
        </div>

        {/* Fallout 4 / Papyrus */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Terminal className="w-5 h-5 text-emerald-300" />
            <div>
              <div className="text-sm font-bold text-white">Fallout 4 / Papyrus</div>
              <span className="text-[11px] text-slate-400">Used for writing + compiling .psc into .pex</span>
            </div>
          </div>

          <div className="space-y-2">
            <input
              value={draft.fallout4Path || ''}
              onChange={(e) => handleChange('fallout4Path', e.target.value)}
              placeholder="C:\\Program Files (x86)\\Steam\\steamapps\\common\\Fallout 4"
              className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-sm text-white"
            />
            <input
              value={draft.papyrusCompilerPath || ''}
              onChange={(e) => handleChange('papyrusCompilerPath', e.target.value)}
              placeholder="C:\\...\\Fallout 4\\Papyrus Compiler\\PapyrusCompiler.exe"
              className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-sm text-white"
            />
            <input
              value={draft.papyrusFlagsPath || ''}
              onChange={(e) => handleChange('papyrusFlagsPath', e.target.value)}
              placeholder="C:\\...\\Fallout 4\\Data\\Scripts\\Source\\Base\\Institute_Papyrus_Flags.flg"
              className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-sm text-white"
            />
            <input
              value={draft.papyrusImportPaths || ''}
              onChange={(e) => handleChange('papyrusImportPaths', e.target.value)}
              placeholder='Import paths (semicolon-separated), e.g. C:\\...\\Data\\Scripts\\Source;C:\\...\\Data\\Scripts\\Source\\Base'
              className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-sm text-white"
            />
            <input
              value={draft.papyrusSourcePath || ''}
              onChange={(e) => handleChange('papyrusSourcePath', e.target.value)}
              placeholder="Source output folder for .psc (optional), e.g. ...\\Data\\Scripts\\Source\\User"
              className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-sm text-white"
            />
            <input
              value={draft.papyrusOutputPath || ''}
              onChange={(e) => handleChange('papyrusOutputPath', e.target.value)}
              placeholder="PEX output folder (optional), e.g. ...\\Data\\Scripts"
              className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-sm text-white"
            />
          </div>

          <div className="mt-2 text-[11px] text-slate-500">
            Tip: you can leave these blank and still use Workshop compile manually, but CK Link works best when configured.
          </div>
        </div>

        {/* Blender */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Palette className="w-5 h-5 text-blue-400" />
            <div>
              <div className="text-sm font-bold text-white">Blender</div>
              <a href="https://www.blender.org/download/" target="_blank" rel="noreferrer" className="text-[11px] text-blue-400 hover:text-blue-300 inline-flex items-center gap-1"><ExternalLink className="w-3 h-3" /> Official download</a>
            </div>
          </div>
          <input value={draft.blenderPath || ''} onChange={(e) => handleChange('blenderPath', e.target.value)} placeholder="C:\\Path\\To\\blender.exe" className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-sm text-white" />
          <div className="mt-2 flex gap-2">
            <button onClick={() => browsePath('blenderPath', 'Blender')} className="px-3 py-1 bg-slate-700 hover:bg-slate-600 border border-slate-600 rounded text-[11px] font-bold flex items-center gap-1"><FolderOpen className="w-3 h-3" /> Browse</button>
            <button onClick={() => testLaunch(draft.blenderPath, 'Blender')} className="px-3 py-1 bg-emerald-700 hover:bg-emerald-600 border border-emerald-500 rounded text-[11px] font-bold flex items-center gap-1"><Play className="w-3 h-3" /> Test Launch</button>
            <button onClick={() => aiLaunchTest('blender', 'Blender')} className="px-3 py-1 bg-sky-700 hover:bg-sky-600 border border-sky-500 rounded text-[11px] font-bold flex items-center gap-1"><Zap className="w-3 h-3" /> AI Launch Test</button>
          </div>
        </div>

        {/* LOOT */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
            <div>
              <div className="text-sm font-bold text-white">LOOT</div>
              <a href="https://loot.github.io/" target="_blank" rel="noreferrer" className="text-[11px] text-blue-400 hover:text-blue-300 inline-flex items-center gap-1"><ExternalLink className="w-3 h-3" /> Official Site</a>
            </div>
          </div>
          <input value={draft.lootPath || ''} onChange={(e) => handleChange('lootPath', e.target.value)} placeholder="C:\\Path\\To\\LOOT.exe" className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-sm text-white" />
          <div className="mt-2 flex gap-2">
            <button onClick={() => browsePath('lootPath', 'LOOT')} className="px-3 py-1 bg-slate-700 hover:bg-slate-600 border border-slate-600 rounded text-[11px] font-bold flex items-center gap-1"><FolderOpen className="w-3 h-3" /> Browse</button>
            <button onClick={() => testLaunch(draft.lootPath, 'LOOT')} className="px-3 py-1 bg-emerald-700 hover:bg-emerald-600 border border-emerald-500 rounded text-[11px] font-bold flex items-center gap-1"><Play className="w-3 h-3" /> Test Launch</button>
            <button onClick={() => aiLaunchTest('loot', 'LOOT')} className="px-3 py-1 bg-sky-700 hover:bg-sky-600 border border-sky-500 rounded text-[11px] font-bold flex items-center gap-1"><Zap className="w-3 h-3" /> AI Launch Test</button>
          </div>
        </div>

        {/* Mod Organizer 2 */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Package className="w-5 h-5 text-blue-500" />
            <div>
              <div className="text-sm font-bold text-white flex items-center gap-2">
                Mod Organizer 2
                <span className={`text-[10px] px-2 py-0.5 rounded font-mono ${draft.mo2Path ? 'bg-green-900 text-green-300' : 'bg-red-900 text-red-300'}`}>
                  {getPathStatusIcon(draft.mo2Path)}
                </span>
              </div>
              <a href="https://www.nexusmods.com/skyrimspecialedition/mods/6194" target="_blank" rel="noreferrer" className="text-[11px] text-blue-400 hover:text-blue-300 inline-flex items-center gap-1"><ExternalLink className="w-3 h-3" /> Download from Nexus Mods</a>
            </div>
          </div>
          <input value={draft.mo2Path || ''} onChange={(e) => handleChange('mo2Path', e.target.value)} placeholder="Click Browse to select ModOrganizer.exe" title={draft.mo2Path || 'No path configured'} className={`w-full rounded px-3 py-2 text-xs border font-mono ${getPathStatusStyle(draft.mo2Path)}`} />
          {draft.mo2Path && <div className="mt-1 text-[10px] text-slate-500 font-mono break-all">📁 {draft.mo2Path}</div>}
          <div className="mt-2 flex gap-2">
            <button onClick={() => browsePath('mo2Path', 'Mod Organizer 2')} className="px-3 py-1 bg-slate-700 hover:bg-slate-600 border border-slate-600 rounded text-[11px] font-bold flex items-center gap-1"><FolderOpen className="w-3 h-3" /> Browse</button>
            <button onClick={() => testLaunch(draft.mo2Path, 'Mod Organizer 2')} className="px-3 py-1 bg-emerald-700 hover:bg-emerald-600 border border-emerald-500 rounded text-[11px] font-bold flex items-center gap-1"><Play className="w-3 h-3" /> Test Launch</button>
            <button onClick={() => aiLaunchTest('mo2', 'Mod Organizer 2')} className="px-3 py-1 bg-sky-700 hover:bg-sky-600 border border-sky-500 rounded text-[11px] font-bold flex items-center gap-1"><Zap className="w-3 h-3" /> AI Launch Test</button>
          </div>
        </div>

        {/* Vortex */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Zap className="w-5 h-5 text-orange-400" />
            <div>
              <div className="text-sm font-bold text-white">Vortex</div>
              <a href="https://www.nexusmods.com/about/vortex/" target="_blank" rel="noreferrer" className="text-[11px] text-blue-400 hover:text-blue-300 inline-flex items-center gap-1"><ExternalLink className="w-3 h-3" /> Official Site</a>
            </div>
          </div>
          <input value={draft.vortexPath || ''} onChange={(e) => handleChange('vortexPath', e.target.value)} placeholder="C:\\Path\\To\\Vortex.exe" className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-sm text-white" />
          <div className="mt-2 flex gap-2">
            <button onClick={() => browsePath('vortexPath', 'Vortex')} className="px-3 py-1 bg-slate-700 hover:bg-slate-600 border border-slate-600 rounded text-[11px] font-bold flex items-center gap-1"><FolderOpen className="w-3 h-3" /> Browse</button>
            <button onClick={() => testLaunch(draft.vortexPath, 'Vortex')} className="px-3 py-1 bg-emerald-700 hover:bg-emerald-600 border border-emerald-500 rounded text-[11px] font-bold flex items-center gap-1"><Play className="w-3 h-3" /> Test Launch</button>
            <button onClick={() => aiLaunchTest('vortex', 'Vortex')} className="px-3 py-1 bg-sky-700 hover:bg-sky-600 border border-sky-500 rounded text-[11px] font-bold flex items-center gap-1"><Zap className="w-3 h-3" /> AI Launch Test</button>
          </div>
        </div>

        {/* F4SE */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Terminal className="w-5 h-5 text-red-400" />
            <div>
              <div className="text-sm font-bold text-white">F4SE Loader</div>
              <a href="https://f4se.silverlock.org/" target="_blank" rel="noreferrer" className="text-[11px] text-blue-400 hover:text-blue-300 inline-flex items-center gap-1"><ExternalLink className="w-3 h-3" /> Official Site</a>
            </div>
          </div>
          <input value={draft.f4sePath || ''} onChange={(e) => handleChange('f4sePath', e.target.value)} placeholder="C:\\Path\\To\\f4se_loader.exe" className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-sm text-white" />
          <div className="mt-2 flex gap-2">
            <button onClick={() => browsePath('f4sePath', 'F4SE')} className="px-3 py-1 bg-slate-700 hover:bg-slate-600 border border-slate-600 rounded text-[11px] font-bold flex items-center gap-1"><FolderOpen className="w-3 h-3" /> Browse</button>
            <button onClick={() => testLaunch(draft.f4sePath, 'F4SE')} className="px-3 py-1 bg-emerald-700 hover:bg-emerald-600 border border-emerald-500 rounded text-[11px] font-bold flex items-center gap-1"><Play className="w-3 h-3" /> Test Launch</button>
            <button onClick={() => aiLaunchTest('f4se', 'F4SE Loader')} className="px-3 py-1 bg-sky-700 hover:bg-sky-600 border border-sky-500 rounded text-[11px] font-bold flex items-center gap-1"><Zap className="w-3 h-3" /> AI Launch Test</button>
          </div>
        </div>

        {/* BodySlide / Outfit Studio */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Palette className="w-5 h-5 text-pink-400" />
            <div>
              <div className="text-sm font-bold text-white">BodySlide & Outfit Studio</div>
              <a href="https://www.nexusmods.com/fallout4/mods/25" target="_blank" rel="noreferrer" className="text-[11px] text-blue-400 hover:text-blue-300 inline-flex items-center gap-1"><ExternalLink className="w-3 h-3" /> Download from Nexus Mods</a>
            </div>
          </div>
          <input value={draft.bodySlidePath || ''} onChange={(e) => handleChange('bodySlidePath', e.target.value)} placeholder="C:\\Path\\To\\BodySlide.exe" className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-sm text-white" />
          <div className="mt-2 flex gap-2">
            <button onClick={() => browsePath('bodySlidePath', 'BodySlide')} className="px-3 py-1 bg-slate-700 hover:bg-slate-600 border border-slate-600 rounded text-[11px] font-bold flex items-center gap-1"><FolderOpen className="w-3 h-3" /> Browse</button>
            <button onClick={() => testLaunch(draft.bodySlidePath, 'BodySlide')} className="px-3 py-1 bg-emerald-700 hover:bg-emerald-600 border border-emerald-500 rounded text-[11px] font-bold flex items-center gap-1"><Play className="w-3 h-3" /> Test Launch</button>
            <button onClick={() => aiLaunchTest('bodyslide', 'BodySlide & Outfit Studio')} className="px-3 py-1 bg-sky-700 hover:bg-sky-600 border border-sky-500 rounded text-[11px] font-bold flex items-center gap-1"><Zap className="w-3 h-3" /> AI Launch Test</button>
          </div>
        </div>

        {/* BAE - Bethesda Archive Extractor */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Archive className="w-5 h-5 text-amber-500" />
            <div>
              <div className="text-sm font-bold text-white">B.A.E. (Archive Extractor)</div>
              <a href="https://www.nexusmods.com/fallout4/mods/78" target="_blank" rel="noreferrer" className="text-[11px] text-blue-400 hover:text-blue-300 inline-flex items-center gap-1"><ExternalLink className="w-3 h-3" /> Download from Nexus Mods</a>
            </div>
          </div>
          <input value={draft.baePath || ''} onChange={(e) => handleChange('baePath', e.target.value)} placeholder="C:\\Path\\To\\BAE.exe" className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-sm text-white" />
          <div className="mt-2 flex gap-2">
            <button onClick={() => browsePath('baePath', 'BAE')} className="px-3 py-1 bg-slate-700 hover:bg-slate-600 border border-slate-600 rounded text-[11px] font-bold flex items-center gap-1"><FolderOpen className="w-3 h-3" /> Browse</button>
            <button onClick={() => testLaunch(draft.baePath, 'BAE')} className="px-3 py-1 bg-emerald-700 hover:bg-emerald-600 border border-emerald-500 rounded text-[11px] font-bold flex items-center gap-1"><Play className="w-3 h-3" /> Test Launch</button>
            <button onClick={() => aiLaunchTest('bae', 'B.A.E.')} className="px-3 py-1 bg-sky-700 hover:bg-sky-600 border border-sky-500 rounded text-[11px] font-bold flex items-center gap-1"><Zap className="w-3 h-3" /> AI Launch Test</button>
          </div>
        </div>

        {/* GIMP / Photopea (Local if applicable) */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <ImageIcon className="w-5 h-5 text-indigo-400" />
            <div>
              <div className="text-sm font-bold text-white">Texture Editor (GIMP/Photoshop)</div>
              <span className="text-[11px] text-slate-400">Used for DDS editing and texture creation</span>
            </div>
          </div>
          <input value={draft.gimpPath || ''} onChange={(e) => handleChange('gimpPath', e.target.value)} placeholder="C:\\Program Files\\GIMP 3\\bin\\gimp-3.0.exe or C:\\Program Files\\GIMP 2\\bin\\gimp-2.10.exe" className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-sm text-white" />
          <div className="mt-2 flex gap-2">
            <button onClick={() => browsePath('gimpPath', 'Texture Editor')} className="px-3 py-1 bg-slate-700 hover:bg-slate-600 border border-slate-600 rounded text-[11px] font-bold flex items-center gap-1"><FolderOpen className="w-3 h-3" /> Browse</button>
            <button onClick={() => testLaunch(draft.gimpPath, 'Texture Editor')} className="px-3 py-1 bg-emerald-700 hover:bg-emerald-600 border border-emerald-500 rounded text-[11px] font-bold flex items-center gap-1"><Play className="w-3 h-3" /> Test Launch</button>
            <button onClick={() => aiLaunchTest('gimp', 'Texture Editor')} className="px-3 py-1 bg-sky-700 hover:bg-sky-600 border border-sky-500 rounded text-[11px] font-bold flex items-center gap-1"><Zap className="w-3 h-3" /> AI Launch Test</button>
          </div>
        </div>

        {/* Archive2 */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Archive className="w-5 h-5 text-yellow-400" />
            <div>
              <div className="text-sm font-bold text-white">Archive2 (Official CK Tool)</div>
              <span className="text-[11px] text-slate-400">Located in FO4 Tools folder</span>
            </div>
          </div>
          <input value={draft.archive2Path || ''} onChange={(e) => handleChange('archive2Path', e.target.value)} placeholder="C:\\Path\\To\\Archive2.exe" className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-sm text-white" />
          <div className="mt-2 flex gap-2">
            <button onClick={() => browsePath('archive2Path', 'Archive2')} className="px-3 py-1 bg-slate-700 hover:bg-slate-600 border border-slate-600 rounded text-[11px] font-bold flex items-center gap-1"><FolderOpen className="w-3 h-3" /> Browse</button>
            <button onClick={() => testLaunch(draft.archive2Path, 'Archive2')} className="px-3 py-1 bg-emerald-700 hover:bg-emerald-600 border border-emerald-500 rounded text-[11px] font-bold flex items-center gap-1"><Play className="w-3 h-3" /> Test Launch</button>
            <button onClick={() => aiLaunchTest('archive2', 'Archive2')} className="px-3 py-1 bg-sky-700 hover:bg-sky-600 border border-sky-500 rounded text-[11px] font-bold flex items-center gap-1"><Zap className="w-3 h-3" /> AI Launch Test</button>
          </div>
        </div>

        {/* Upscayl */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Zap className="w-5 h-5 text-indigo-400" />
            <div>
              <div className="text-sm font-bold text-white">Upscayl (AI Image Upscaler)</div>
              <span className="text-[11px] text-slate-400">Free, open-source AI upscaling tool</span>
            </div>
          </div>
          <input value={draft.upscaylPath || ''} onChange={(e) => handleChange('upscaylPath', e.target.value)} placeholder="C:\\Path\\To\\Upscayl.exe" className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-sm text-white" />
          <div className="mt-2 flex gap-2">
            <button onClick={() => browsePath('upscaylPath', 'Upscayl')} className="px-3 py-1 bg-slate-700 hover:bg-slate-600 border border-slate-600 rounded text-[11px] font-bold flex items-center gap-1"><FolderOpen className="w-3 h-3" /> Browse</button>
            <button onClick={() => testLaunch(draft.upscaylPath, 'Upscayl')} className="px-3 py-1 bg-emerald-700 hover:bg-emerald-600 border border-emerald-500 rounded text-[11px] font-bold flex items-center gap-1"><Play className="w-3 h-3" /> Test Launch</button>
            <button onClick={() => aiLaunchTest('upscayl', 'Upscayl')} className="px-3 py-1 bg-sky-700 hover:bg-sky-600 border border-sky-500 rounded text-[11px] font-bold flex items-center gap-1"><Zap className="w-3 h-3" /> AI Launch Test</button>
          </div>
        </div>

        {/* NVIDIA Texture Tools */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <ImageIcon className="w-5 h-5 text-green-400" />
            <div>
              <div className="text-sm font-bold text-white">NVIDIA Texture Tools Exporter</div>
              <span className="text-[11px] text-slate-400">Professional DDS creation & compression</span>
            </div>
          </div>
          <input value={draft.nvidiaTextureToolsPath || ''} onChange={(e) => handleChange('nvidiaTextureToolsPath', e.target.value)} placeholder="C:\\Path\\To\\nvcompress.exe" className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-sm text-white" />
          <div className="mt-2 flex gap-2">
            <button onClick={() => browsePath('nvidiaTextureToolsPath', 'NVIDIA Texture Tools')} className="px-3 py-1 bg-slate-700 hover:bg-slate-600 border border-slate-600 rounded text-[11px] font-bold flex items-center gap-1"><FolderOpen className="w-3 h-3" /> Browse</button>
            <button onClick={() => testLaunch(draft.nvidiaTextureToolsPath, 'NVIDIA Texture Tools')} className="px-3 py-1 bg-emerald-700 hover:bg-emerald-600 border border-emerald-500 rounded text-[11px] font-bold flex items-center gap-1"><Play className="w-3 h-3" /> Test Launch</button>
            <button onClick={() => aiLaunchTest('nvidiaTextureTools', 'NVIDIA Texture Tools')} className="px-3 py-1 bg-sky-700 hover:bg-sky-600 border border-sky-500 rounded text-[11px] font-bold flex items-center gap-1"><Zap className="w-3 h-3" /> AI Launch Test</button>
          </div>
        </div>

        {/* ShaderMap 4 */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Palette className="w-5 h-5 text-orange-400" />
            <div>
              <div className="text-sm font-bold text-white">ShaderMap 4</div>
              <span className="text-[11px] text-slate-400">Generate Normal, AO, and Displacement maps</span>
            </div>
          </div>
          <input value={draft.shaderMapPath || ''} onChange={(e) => handleChange('shaderMapPath', e.target.value)} placeholder="C:\\Path\\To\\ShaderMap 4.exe" className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-sm text-white" />
          <div className="mt-2 flex gap-2">
            <button onClick={() => browsePath('shaderMapPath', 'ShaderMap 4')} className="px-3 py-1 bg-slate-700 hover:bg-slate-600 border border-slate-600 rounded text-[11px] font-bold flex items-center gap-1"><FolderOpen className="w-3 h-3" /> Browse</button>
            <button onClick={() => testLaunch(draft.shaderMapPath, 'ShaderMap 4')} className="px-3 py-1 bg-emerald-700 hover:bg-emerald-600 border border-emerald-500 rounded text-[11px] font-bold flex items-center gap-1"><Play className="w-3 h-3" /> Test Launch</button>
            <button onClick={() => aiLaunchTest('shadermap', 'ShaderMap 4')} className="px-3 py-1 bg-sky-700 hover:bg-sky-600 border border-sky-500 rounded text-[11px] font-bold flex items-center gap-1"><Zap className="w-3 h-3" /> AI Launch Test</button>
          </div>
        </div>

        {/* Autodesk FBX Converter */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Package className="w-5 h-5 text-blue-400" />
            <div>
              <div className="text-sm font-bold text-white">Autodesk FBX Converter</div>
              <span className="text-[11px] text-slate-400">Convert 3D files to legacy FBX for modding</span>
            </div>
          </div>
          <input value={draft.autodeskFbxPath || ''} onChange={(e) => handleChange('autodeskFbxPath', e.target.value)} placeholder="C:\\Path\\To\\FBXConverter.exe" className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-sm text-white" />
          <div className="mt-2 flex gap-2">
            <button onClick={() => browsePath('autodeskFbxPath', 'Autodesk FBX Converter')} className="px-3 py-1 bg-slate-700 hover:bg-slate-600 border border-slate-600 rounded text-[11px] font-bold flex items-center gap-1"><FolderOpen className="w-3 h-3" /> Browse</button>
            <button onClick={() => testLaunch(draft.autodeskFbxPath, 'Autodesk FBX Converter')} className="px-3 py-1 bg-emerald-700 hover:bg-emerald-600 border border-emerald-500 rounded text-[11px] font-bold flex items-center gap-1"><Play className="w-3 h-3" /> Test Launch</button>
            <button onClick={() => aiLaunchTest('autodesk fbx', 'Autodesk FBX Converter')} className="px-3 py-1 bg-sky-700 hover:bg-sky-600 border border-sky-500 rounded text-[11px] font-bold flex items-center gap-1"><Zap className="w-3 h-3" /> AI Launch Test</button>
          </div>
        </div>

        {/* NVIDIA Omniverse */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Zap className="w-5 h-5 text-green-500" />
            <div>
              <div className="text-sm font-bold text-white">NVIDIA Omniverse</div>
              <span className="text-[11px] text-slate-400">Advanced 3D collaboration & simulation</span>
            </div>
          </div>
          <input value={draft.nvidiaOmniversePath || ''} onChange={(e) => handleChange('nvidiaOmniversePath', e.target.value)} placeholder="C:\\Path\\To\\Omniverse.exe" className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-sm text-white" />
          <div className="mt-2 flex gap-2">
            <button onClick={() => browsePath('nvidiaOmniversePath', 'NVIDIA Omniverse')} className="px-3 py-1 bg-slate-700 hover:bg-slate-600 border border-slate-600 rounded text-[11px] font-bold flex items-center gap-1"><FolderOpen className="w-3 h-3" /> Browse</button>
            <button onClick={() => testLaunch(draft.nvidiaOmniversePath, 'NVIDIA Omniverse')} className="px-3 py-1 bg-emerald-700 hover:bg-emerald-600 border border-emerald-500 rounded text-[11px] font-bold flex items-center gap-1"><Play className="w-3 h-3" /> Test Launch</button>
            <button onClick={() => aiLaunchTest('nvidia omniverse', 'NVIDIA Omniverse')} className="px-3 py-1 bg-sky-700 hover:bg-sky-600 border border-sky-500 rounded text-[11px] font-bold flex items-center gap-1"><Zap className="w-3 h-3" /> AI Launch Test</button>
          </div>
        </div>

        {/* NifUtilsSuite */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Wrench className="w-5 h-5 text-amber-600" />
            <div>
              <div className="text-sm font-bold text-white">NifUtilsSuite</div>
              <span className="text-[11px] text-slate-400">Essential tools for NIF file manipulation</span>
            </div>
          </div>
          <input value={draft.nifUtilsSuitePath || ''} onChange={(e) => handleChange('nifUtilsSuitePath', e.target.value)} placeholder="C:\\Path\\To\\NifUtilsSuite.exe" className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-sm text-white" />
          <div className="mt-2 flex gap-2">
            <button onClick={() => browsePath('nifUtilsSuitePath', 'NifUtilsSuite')} className="px-3 py-1 bg-slate-700 hover:bg-slate-600 border border-slate-600 rounded text-[11px] font-bold flex items-center gap-1"><FolderOpen className="w-3 h-3" /> Browse</button>
            <button onClick={() => testLaunch(draft.nifUtilsSuitePath, 'NifUtilsSuite')} className="px-3 py-1 bg-emerald-700 hover:bg-emerald-600 border border-emerald-500 rounded text-[11px] font-bold flex items-center gap-1"><Play className="w-3 h-3" /> Test Launch</button>
            <button onClick={() => aiLaunchTest('nifutils', 'NifUtilsSuite')} className="px-3 py-1 bg-sky-700 hover:bg-sky-600 border border-sky-500 rounded text-[11px] font-bold flex items-center gap-1"><Zap className="w-3 h-3" /> AI Launch Test</button>
          </div>
        </div>

        {/* Wrye Bash */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <ShieldCheck className="w-5 h-5 text-cyan-400" />
            <div>
              <div className="text-sm font-bold text-white">Wrye Bash</div>
              <a href="https://www.nexusmods.com/fallout4/mods/22562" target="_blank" rel="noreferrer" className="text-[11px] text-blue-400 hover:text-blue-300 inline-flex items-center gap-1"><ExternalLink className="w-3 h-3" /> Download from Nexus Mods</a>
            </div>
          </div>
          <input value={draft.wryeBashPath || ''} onChange={(e) => handleChange('wryeBashPath', e.target.value)} placeholder="C:\\Games\\SteamLibrary\\steamapps\\common\\Fallout 4\\Mbash.exe" className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-sm text-white" />
          <div className="mt-2 flex gap-2">
            <button onClick={() => browsePath('wryeBashPath', 'Wrye Bash')} className="px-3 py-1 bg-slate-700 hover:bg-slate-600 border border-slate-600 rounded text-[11px] font-bold flex items-center gap-1"><FolderOpen className="w-3 h-3" /> Browse</button>
            <button onClick={() => testLaunch(draft.wryeBashPath, 'Wrye Bash')} className="px-3 py-1 bg-emerald-700 hover:bg-emerald-600 border border-emerald-500 rounded text-[11px] font-bold flex items-center gap-1"><Play className="w-3 h-3" /> Test Launch</button>
            <button onClick={() => aiLaunchTest('wryebash', 'Wrye Bash')} className="px-3 py-1 bg-sky-700 hover:bg-sky-600 border border-sky-500 rounded text-[11px] font-bold flex items-center gap-1"><Zap className="w-3 h-3" /> AI Launch Test</button>
          </div>
        </div>

        {/* Photopea (PWA/Local) */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <ExternalLink className="w-5 h-5 text-blue-400" />
            <div>
              <div className="text-sm font-bold text-white">Photopea</div>
              <span className="text-[11px] text-slate-400">Desktop wrapper or local shortcut</span>
            </div>
          </div>
          <input value={draft.photopeaPath || ''} onChange={(e) => handleChange('photopeaPath', e.target.value)} placeholder="C:\\Path\\To\\Photopea.exe" className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-sm text-white" />
          <div className="mt-2 flex gap-2">
            <button onClick={() => browsePath('photopeaPath', 'Photopea')} className="px-3 py-1 bg-slate-700 hover:bg-slate-600 border border-slate-600 rounded text-[11px] font-bold flex items-center gap-1"><FolderOpen className="w-3 h-3" /> Browse</button>
            <button onClick={() => testLaunch(draft.photopeaPath, 'Photopea')} className="px-3 py-1 bg-emerald-700 hover:bg-emerald-600 border border-emerald-500 rounded text-[11px] font-bold flex items-center gap-1"><Play className="w-3 h-3" /> Test Launch</button>
            <button onClick={() => aiLaunchTest('photopea', 'Photopea')} className="px-3 py-1 bg-sky-700 hover:bg-sky-600 border border-sky-500 rounded text-[11px] font-bold flex items-center gap-1"><Zap className="w-3 h-3" /> AI Launch Test</button>
          </div>
        </div>

        {/* PhotoDemon */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Palette className="w-5 h-5 text-red-500" />
            <div>
              <div className="text-sm font-bold text-white">PhotoDemon</div>
              <span className="text-[11px] text-slate-400">Portable photo editor</span>
            </div>
          </div>
          <input value={draft.photoDemonPath || ''} onChange={(e) => handleChange('photoDemonPath', e.target.value)} placeholder="C:\\Path\\To\\PhotoDemon.exe" className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-sm text-white" />
          <div className="mt-2 flex gap-2">
            <button onClick={() => browsePath('photoDemonPath', 'PhotoDemon')} className="px-3 py-1 bg-slate-700 hover:bg-slate-600 border border-slate-600 rounded text-[11px] font-bold flex items-center gap-1"><FolderOpen className="w-3 h-3" /> Browse</button>
            <button onClick={() => testLaunch(draft.photoDemonPath, 'PhotoDemon')} className="px-3 py-1 bg-emerald-700 hover:bg-emerald-600 border border-emerald-500 rounded text-[11px] font-bold flex items-center gap-1"><Play className="w-3 h-3" /> Test Launch</button>
            <button onClick={() => aiLaunchTest('photodemon', 'PhotoDemon')} className="px-3 py-1 bg-sky-700 hover:bg-sky-600 border border-sky-500 rounded text-[11px] font-bold flex items-center gap-1"><Zap className="w-3 h-3" /> AI Launch Test</button>
          </div>
        </div>

        {/* UnWrap3 */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Maximize2 className="w-5 h-5 text-yellow-500" />
            <div>
              <div className="text-sm font-bold text-white">UnWrap3</div>
              <span className="text-[11px] text-slate-400">UV Unwrapping tool</span>
            </div>
          </div>
          <input value={draft.unWrap3Path || ''} onChange={(e) => handleChange('unWrap3Path', e.target.value)} placeholder="C:\\Path\\To\\UnWrap3.exe" className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-sm text-white" />
          <div className="mt-2 flex gap-2">
            <button onClick={() => browsePath('unWrap3Path', 'UnWrap3')} className="px-3 py-1 bg-slate-700 hover:bg-slate-600 border border-slate-600 rounded text-[11px] font-bold flex items-center gap-1"><FolderOpen className="w-3 h-3" /> Browse</button>
            <button onClick={() => testLaunch(draft.unWrap3Path, 'UnWrap3')} className="px-3 py-1 bg-emerald-700 hover:bg-emerald-600 border border-emerald-500 rounded text-[11px] font-bold flex items-center gap-1"><Play className="w-3 h-3" /> Test Launch</button>
          </div>
        </div>

        {/* Spin 3D Mesh Converter */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <RefreshCw className="w-5 h-5 text-violet-400" />
            <div>
              <div className="text-sm font-bold text-white">Spin 3D</div>
              <span className="text-[11px] text-slate-400">Mesh file converter</span>
            </div>
          </div>
          <input value={draft.spin3dPath || ''} onChange={(e) => handleChange('spin3dPath', e.target.value)} placeholder="C:\\Path\\To\\spin3d.exe" className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-sm text-white" />
          <div className="mt-2 flex gap-2">
            <button onClick={() => browsePath('spin3dPath', 'Spin 3D')} className="px-3 py-1 bg-slate-700 hover:bg-slate-600 border border-slate-600 rounded text-[11px] font-bold flex items-center gap-1"><FolderOpen className="w-3 h-3" /> Browse</button>
            <button onClick={() => testLaunch(draft.spin3dPath, 'Spin 3D')} className="px-3 py-1 bg-emerald-700 hover:bg-emerald-600 border border-emerald-500 rounded text-[11px] font-bold flex items-center gap-1"><Play className="w-3 h-3" /> Test Launch</button>
          </div>
        </div>

        {/* NVIDIA Canvas */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Palette className="w-5 h-5 text-green-300" />
            <div>
              <div className="text-sm font-bold text-white">NVIDIA Canvas <span className="text-slate-500 text-xs">(Vita Canvas)</span></div>
              <span className="text-[11px] text-slate-400">AI-powered landscape painting - Look for NVIDIACanvas.exe</span>
            </div>
          </div>
          <input value={draft.nvidiaCanvasPath || ''} onChange={(e) => handleChange('nvidiaCanvasPath', e.target.value)} placeholder="C:\\Program Files\\NVIDIA Corporation\\NVIDIA Canvas\\NVIDIACanvas.exe" className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-sm text-white" />
          <div className="mt-2 flex gap-2">
            <button onClick={() => browsePath('nvidiaCanvasPath', 'NVIDIA Canvas')} className="px-3 py-1 bg-slate-700 hover:bg-slate-600 border border-slate-600 rounded text-[11px] font-bold flex items-center gap-1"><FolderOpen className="w-3 h-3" /> Browse</button>
            <button onClick={() => testLaunch(draft.nvidiaCanvasPath, 'NVIDIA Canvas')} className="px-3 py-1 bg-emerald-700 hover:bg-emerald-600 border border-emerald-500 rounded text-[11px] font-bold flex items-center gap-1"><Play className="w-3 h-3" /> Test Launch</button>
          </div>
        </div>

        {/* PJM Scripts */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Terminal className="w-5 h-5 text-emerald-500" />
            <div>
              <div className="text-sm font-bold text-white">PJM Precombine Scripts</div>
              <span className="text-[11px] text-slate-400">Path to xEdit script folder for PJM tools</span>
            </div>
          </div>
          <input value={draft.pjmScriptPath || ''} onChange={(e) => handleChange('pjmScriptPath', e.target.value)} placeholder="C:\\Tools\\xEdit\\Edit Scripts" className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-sm text-white" />
          <div className="mt-2 flex gap-2">
            <button onClick={() => browsePath('pjmScriptPath', 'PJM Scripts')} className="px-3 py-1 bg-slate-700 hover:bg-slate-600 border border-slate-600 rounded text-[11px] font-bold flex items-center gap-1"><FolderOpen className="w-3 h-3" /> Browse</button>
            <button onClick={() => testLaunch(draft.pjmScriptPath, 'PJM Scripts')} className="px-3 py-1 bg-emerald-700 hover:bg-emerald-600 border border-emerald-500 rounded text-[11px] font-bold flex items-center gap-1"><Play className="w-3 h-3" /> Folder Open</button>
          </div>
        </div>
        </div>
      </div>
    </div>
  );
};

export default ExternalToolsSettings;
