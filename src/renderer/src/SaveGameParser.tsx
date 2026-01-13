import React, { useState } from 'react';
import { Save, Upload, User, MapPin, Package, Scroll, AlertTriangle, Cpu } from 'lucide-react';

interface SaveData {
  playerName: string;
  playerLevel: number;
  location: string;
  playTime: string;
  health: number;
  activeMods: string[];
  missingMasters: string[];
  questCount: number;
  inventoryWeight: number;
  caps: number;
}

export const SaveGameParser: React.FC = () => {
  const [savePath, setSavePath] = useState('');
  const [loading, setLoading] = useState(false);
  const [saveData, setSaveData] = useState<SaveData | null>(null);
  const [error, setError] = useState('');

  const parseSaveFile = async () => {
    if (!savePath) return;

    setLoading(true);
    setError('');

    try {
      // Real implementation would use Desktop Bridge with resaver library
      const response = await fetch('http://localhost:21337/savegame/parse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: savePath })
      });

      if (response.ok) {
        const data = await response.json();
        setSaveData(data);
      } else {
        throw new Error('Failed to parse save');
      }
    } catch (err) {
      // Demo mode: show example data
      const exampleData: SaveData = {
        playerName: 'Sole Survivor',
        playerLevel: 47,
        location: 'Diamond City',
        playTime: '45h 32m',
        health: 285,
        activeMods: [
          'Fallout4.esm',
          'DLCRobot.esm',
          'DLCCoast.esm',
          'DLCNukaWorld.esm',
          'Unofficial Fallout 4 Patch.esp',
          'ArmorKeywords.esm',
          'WeaponModifications.esp',
          'BetterSettlements.esp',
          'EnhancedLighting.esp'
        ],
        missingMasters: [
          'OldModRemoved.esp'
        ],
        questCount: 23,
        inventoryWeight: 287.5,
        caps: 15234
      };

      setSaveData(exampleData);
      setError('Bridge offline - showing example data. Install resaver library: pip install resaver');
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSavePath(file.name);
    }
  };

  return (
    <div className="h-full bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 overflow-hidden flex flex-col">
      {/* Header */}
      <div className="p-6 border-b border-slate-700 bg-slate-800/50">
        <div className="flex items-center gap-3 mb-4">
          <Save className="w-8 h-8 text-green-400" />
          <div>
            <h1 className="text-2xl font-bold text-white">Save Game Parser</h1>
            <p className="text-sm text-slate-400">Analyze Fallout 4 saves for debugging and optimization</p>
          </div>
        </div>

        {/* File Input */}
        <div className="flex gap-3">
          <input
            type="text"
            value={savePath}
            onChange={(e) => setSavePath(e.target.value)}
            placeholder="Path to save file or browse..."
            className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-slate-200 placeholder-slate-500 focus:border-green-500 focus:outline-none"
          />
          <label className="px-6 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-600 text-white font-bold rounded-lg flex items-center gap-2 cursor-pointer transition-colors">
            <Upload className="w-4 h-4" />
            Browse
            <input type="file" accept=".fos" onChange={handleFileSelect} className="hidden" />
          </label>
          <button
            onClick={parseSaveFile}
            disabled={!savePath || loading}
            className="px-6 py-2 bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white font-bold rounded-lg flex items-center gap-2 transition-colors"
          >
            {loading ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Cpu className="w-4 h-4" />
            )}
            Parse Save
          </button>
        </div>

        {error && (
          <div className="mt-3 p-3 bg-amber-900/20 border border-amber-500/30 rounded-lg text-xs text-amber-300">
            ⚠️ {error}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {!saveData && !loading && (
          <div className="flex items-center justify-center h-full text-slate-500">
            <div className="text-center">
              <Save className="w-16 h-16 mx-auto mb-4 opacity-20" />
              <p>Select a save file to analyze</p>
              <p className="text-xs mt-2">Typical location: Documents\My Games\Fallout4\Saves</p>
            </div>
          </div>
        )}

        {saveData && (
          <div className="max-w-6xl mx-auto space-y-4">
            {/* Player Info */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-slate-900 border border-slate-700 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-3">
                  <User className="w-5 h-5 text-blue-400" />
                  <h3 className="font-bold text-white">Player</h3>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Name:</span>
                    <span className="text-white font-bold">{saveData.playerName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Level:</span>
                    <span className="text-white font-mono">{saveData.playerLevel}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Health:</span>
                    <span className="text-green-400 font-mono">{saveData.health} HP</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Caps:</span>
                    <span className="text-amber-400 font-mono">{saveData.caps}</span>
                  </div>
                </div>
              </div>

              <div className="bg-slate-900 border border-slate-700 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-3">
                  <MapPin className="w-5 h-5 text-emerald-400" />
                  <h3 className="font-bold text-white">Location</h3>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Current:</span>
                    <span className="text-white font-bold">{saveData.location}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Play Time:</span>
                    <span className="text-white font-mono">{saveData.playTime}</span>
                  </div>
                </div>
              </div>

              <div className="bg-slate-900 border border-slate-700 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Package className="w-5 h-5 text-purple-400" />
                  <h3 className="font-bold text-white">Inventory</h3>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Weight:</span>
                    <span className="text-white font-mono">{saveData.inventoryWeight} lbs</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Quests:</span>
                    <span className="text-white font-mono">{saveData.questCount} active</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Active Mods */}
            <div className="bg-slate-900 border border-slate-700 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <Scroll className="w-5 h-5 text-cyan-400" />
                <h3 className="font-bold text-white">Active Mods ({saveData.activeMods.length})</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {saveData.activeMods.map((mod, idx) => (
                  <div key={idx} className="bg-slate-800 px-3 py-2 rounded text-sm text-slate-300 font-mono truncate">
                    {mod}
                  </div>
                ))}
              </div>
            </div>

            {/* Missing Masters */}
            {saveData.missingMasters.length > 0 && (
              <div className="bg-red-900/20 border border-red-500/50 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-3">
                  <AlertTriangle className="w-5 h-5 text-red-400" />
                  <h3 className="font-bold text-red-300">Missing Masters</h3>
                </div>
                <p className="text-sm text-red-200 mb-3">
                  These plugins were active when the save was created but are now missing. This can cause crashes!
                </p>
                <div className="space-y-2">
                  {saveData.missingMasters.map((mod, idx) => (
                    <div key={idx} className="bg-red-950 px-3 py-2 rounded text-sm text-red-300 font-mono">
                      ⚠️ {mod}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
