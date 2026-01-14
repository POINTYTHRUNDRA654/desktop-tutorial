import React, { useEffect, useState } from 'react';
import { Save, TestTube2, Wrench, FileCog, Swords, Package, ExternalLink, Play, Palette, FolderOpen } from 'lucide-react';
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
          <button onClick={save} disabled={saving} className="px-4 py-2 bg-emerald-700 hover:bg-emerald-600 border border-emerald-500 rounded text-xs font-bold flex items-center gap-2 transition-all disabled:opacity-50">
            <Save className="w-4 h-4" /> Save
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
          <input value={draft.xeditPath || ''} onChange={(e) => handleChange('xeditPath', e.target.value)} placeholder="C:\\Tools\\xEdit\\FO4Edit.exe" className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-sm text-white" />
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
          <input value={draft.nifSkopePath || ''} onChange={(e) => handleChange('nifSkopePath', e.target.value)} placeholder="C:\\Tools\\NifSkope\\NifSkope.exe" className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-sm text-white" />
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
          <input value={draft.fomodCreatorPath || ''} onChange={(e) => handleChange('fomodCreatorPath', e.target.value)} placeholder="G:\\Tools\\FOMOD Creation Tool 1.7-6821-1-7\\FomodDesigner.exe" className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-sm text-white" />
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
          <input value={draft.creationKitPath || ''} onChange={(e) => handleChange('creationKitPath', e.target.value)} placeholder="C:\\Program Files (x86)\\Bethesda\\CreationKit.exe" className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-sm text-white" />
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
          <input value={draft.blenderPath || ''} onChange={(e) => handleChange('blenderPath', e.target.value)} placeholder="C:\\Program Files\\Blender Foundation\\Blender 4.5\\blender.exe" className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-sm text-white" />
          <div className="mt-2 flex gap-2">
            <button onClick={() => browsePath('blenderPath', 'Blender')} className="px-3 py-1 bg-slate-700 hover:bg-slate-600 border border-slate-600 rounded text-[11px] font-bold flex items-center gap-1"><FolderOpen className="w-3 h-3" /> Browse</button>
            <button onClick={() => testLaunch(draft.blenderPath, 'Blender')} className="px-3 py-1 bg-emerald-700 hover:bg-emerald-600 border border-emerald-500 rounded text-[11px] font-bold flex items-center gap-1"><Play className="w-3 h-3" /> Test Launch</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExternalToolsSettings;
