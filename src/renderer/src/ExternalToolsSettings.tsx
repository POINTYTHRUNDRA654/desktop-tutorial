import React, { useEffect, useState } from 'react';
import { Save, TestTube2, Wrench, FileCog, Swords, Package, ExternalLink, Play, Palette, FolderOpen, ShieldCheck, Zap, Archive, Image as ImageIcon, Terminal, Maximize2, RefreshCw } from 'lucide-react';
import type { Settings } from '../../shared/types';

const ExternalToolsSettings: React.FC = () => {
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
          nifSkopePath: s.nifSkopePath || '',
          fomodCreatorPath: s.fomodCreatorPath || '',
          creationKitPath: s.creationKitPath || '',
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
      await window.electronAPI.setSettings(draft);
      const updated = await window.electronAPI.getSettings();
      setSettings(updated);
      alert("[MOSSY] Configuration protocols updated, Architect. Your workspace is now synced with your external toolchain.");
    } catch (e) {
      console.error('Failed to save settings', e);
      alert('Failed to save settings.');
    } finally {
      setSaving(false);
    }
  };

  const testLaunch = async (path?: string, label?: string) => {
    if (!path) {
      alert('Path not set.');
      return;
    }
    try {
      const bridge = (window as any).electron?.api;
      if (bridge?.openExternal) {
        await bridge.openExternal(path);
      } else {
        alert('Launching external tools requires the Desktop Bridge (Electron).');
      }
    } catch (e) {
      console.error('Failed to launch tool:', e);
      alert(`Could not launch ${label || 'tool'}. Check the configured path.`);
    }
  };

  const browsePath = async (toolKey: keyof Settings, toolName: string) => {
    try {
      const bridge = (window as any).electron?.api || (window as any).electronAPI;
      if (bridge?.pickToolPath) {
        const path = await bridge.pickToolPath(toolName);
        if (path) {
          handleChange(toolKey, path);
        }
      } else {
        alert('File picker requires the Desktop Bridge (Electron).');
      }
    } catch (e) {
      console.error('Failed to pick tool path:', e);
      alert(`Could not open file picker for ${toolName}. Check that Electron is running.`);
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
            'nvidia canvas': 'nvidiaCanvasPath'
        };

        apps.forEach((app: any) => {
            const nameLower = app.name.toLowerCase();
            for (const [key, field] of Object.entries(mappings)) {
                if (nameLower.includes(key) && !newDraft[field]) {
                    newDraft[field] = app.path;
                    foundCount++;
                }
            }
        });

        setDraft(newDraft);
        if (foundCount > 0) {
            alert(`Auto-detected ${foundCount} tools from your recent system scan. Don't forget to Save!`);
        } else {
            alert("Could not match any tools from the scan. You may need to set them manually.");
        }
    } catch (e) {
        alert("Error during auto-detection.");
    }
  };

  return (
    <div className="h-full flex flex-col bg-[#0d1117] text-slate-200 font-sans overflow-hidden">
      <div className="p-4 border-b border-slate-700 bg-slate-900 flex justify-between items-center z-10 shadow-md">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-3">
            <Wrench className="w-6 h-6 text-emerald-400" /> External Tools Settings
          </h2>
          <p className="text-xs text-slate-400 font-mono mt-1">Configure paths to common modding tools</p>
        </div>
        <div className="flex gap-2">
          <button onClick={autoDetect} className="px-4 py-2 bg-purple-900/40 hover:bg-purple-800/60 border border-purple-500 rounded text-xs font-bold flex items-center gap-2 transition-all">
            <Zap className="w-4 h-4" /> Auto-Detect from Scan
          </button>
          <button onClick={save} disabled={saving} className="px-4 py-2 bg-emerald-700 hover:bg-emerald-600 border border-emerald-500 rounded text-xs font-bold flex items-center gap-2 transition-all disabled:opacity-50">
            <Save className="w-4 h-4" /> Save Settings
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* xEdit / FO4Edit */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Swords className="w-5 h-5 text-emerald-400" />
            <div>
              <div className="text-sm font-bold text-white">xEdit / FO4Edit</div>
              <a href="https://www.nexusmods.com/fallout4/mods/2737" target="_blank" rel="noreferrer" className="text-[11px] text-blue-400 hover:text-blue-300 inline-flex items-center gap-1"><ExternalLink className="w-3 h-3" /> Download from Nexus Mods</a>
            </div>
          </div>
          <input value={draft.xeditPath || ''} onChange={(e) => handleChange('xeditPath', e.target.value)} placeholder="C:\\Path\\To\\FO4Edit.exe" className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-sm text-white" />
          <div className="mt-2 flex gap-2">
            <button onClick={() => browsePath('xeditPath', 'xEdit')} className="px-3 py-1 bg-slate-700 hover:bg-slate-600 border border-slate-600 rounded text-[11px] font-bold flex items-center gap-1"><FolderOpen className="w-3 h-3" /> Browse</button>
            <button onClick={() => testLaunch(draft.xeditPath, 'xEdit')} className="px-3 py-1 bg-emerald-700 hover:bg-emerald-600 border border-emerald-500 rounded text-[11px] font-bold flex items-center gap-1"><Play className="w-3 h-3" /> Test Launch</button>
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
          </div>
        </div>

        {/* Mod Organizer 2 */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Package className="w-5 h-5 text-blue-500" />
            <div>
              <div className="text-sm font-bold text-white">Mod Organizer 2</div>
              <a href="https://www.nexusmods.com/skyrimspecialedition/mods/6194" target="_blank" rel="noreferrer" className="text-[11px] text-blue-400 hover:text-blue-300 inline-flex items-center gap-1"><ExternalLink className="w-3 h-3" /> Download from Nexus Mods</a>
            </div>
          </div>
          <input value={draft.mo2Path || ''} onChange={(e) => handleChange('mo2Path', e.target.value)} placeholder="C:\\Path\\To\\ModOrganizer.exe" className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-sm text-white" />
          <div className="mt-2 flex gap-2">
            <button onClick={() => browsePath('mo2Path', 'Mod Organizer 2')} className="px-3 py-1 bg-slate-700 hover:bg-slate-600 border border-slate-600 rounded text-[11px] font-bold flex items-center gap-1"><FolderOpen className="w-3 h-3" /> Browse</button>
            <button onClick={() => testLaunch(draft.mo2Path, 'Mod Organizer 2')} className="px-3 py-1 bg-emerald-700 hover:bg-emerald-600 border border-emerald-500 rounded text-[11px] font-bold flex items-center gap-1"><Play className="w-3 h-3" /> Test Launch</button>
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
          <input value={draft.gimpPath || ''} onChange={(e) => handleChange('gimpPath', e.target.value)} placeholder="C:\\Path\\To\\gimp-2.10.exe" className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-sm text-white" />
          <div className="mt-2 flex gap-2">
            <button onClick={() => browsePath('gimpPath', 'Texture Editor')} className="px-3 py-1 bg-slate-700 hover:bg-slate-600 border border-slate-600 rounded text-[11px] font-bold flex items-center gap-1"><FolderOpen className="w-3 h-3" /> Browse</button>
            <button onClick={() => testLaunch(draft.gimpPath, 'Texture Editor')} className="px-3 py-1 bg-emerald-700 hover:bg-emerald-600 border border-emerald-500 rounded text-[11px] font-bold flex items-center gap-1"><Play className="w-3 h-3" /> Test Launch</button>
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
              <div className="text-sm font-bold text-white">NVIDIA Canvas</div>
              <span className="text-[11px] text-slate-400">AI-powered landscape painting</span>
            </div>
          </div>
          <input value={draft.nvidiaCanvasPath || ''} onChange={(e) => handleChange('nvidiaCanvasPath', e.target.value)} placeholder="C:\\Path\\To\\Canvas.exe" className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-sm text-white" />
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
  );
};

export default ExternalToolsSettings;
