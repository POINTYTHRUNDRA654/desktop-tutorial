import React, { useState } from 'react';
import { Package, Search, AlertTriangle, CheckCircle, Info, TrendingUp, Filter } from 'lucide-react';
import { POPULAR_MODS, MOD_CATEGORIES, getModsByCategory, PopularMod } from './PopularModsKnowledge';

export const PopularModsDatabase: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [selectedMod, setSelectedMod] = useState<PopularMod | null>(null);

  const filteredMods = POPULAR_MODS.filter(mod => {
    const matchesSearch = mod.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         mod.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || mod.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const sortedMods = [...filteredMods].sort((a, b) => 
    parseInt(b.usage) - parseInt(a.usage)
  );

  const getUsageColor = (usage: string) => {
    const percent = parseInt(usage);
    if (percent >= 70) return 'text-green-400';
    if (percent >= 40) return 'text-blue-400';
    if (percent >= 20) return 'text-amber-400';
    return 'text-slate-400';
  };

  return (
    <div className="h-full bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 overflow-hidden flex flex-col">
      {/* Header */}
      <div className="p-6 border-b border-slate-700 bg-slate-800/50">
        <div className="flex items-center gap-3">
          <Package className="w-8 h-8 text-indigo-400" />
          <div>
            <h1 className="text-2xl font-bold text-white">Popular Mods Database</h1>
            <p className="text-sm text-slate-400">Compatibility knowledge for the most-used Fallout 4 mods</p>
          </div>
        </div>
      </div>

      {/* Search & Filter */}
      <div className="p-6 border-b border-slate-700 bg-slate-800/30">
        <div className="flex gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search mods..."
              className="w-full pl-10 pr-4 py-2 bg-slate-950 border border-slate-700 rounded-lg text-slate-200 placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
            />
          </div>

          <div className="relative">
            <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-500" />
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="pl-10 pr-8 py-2 bg-slate-950 border border-slate-700 rounded-lg text-slate-200 focus:border-indigo-500 focus:outline-none appearance-none"
            >
              <option value="All">All Categories</option>
              {MOD_CATEGORIES.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden flex">
        {/* Mods List */}
        <div className="w-1/2 border-r border-slate-700 overflow-y-auto">
          <div className="p-4 space-y-2">
            {sortedMods.map((mod, idx) => (
              <div
                key={idx}
                onClick={() => setSelectedMod(mod)}
                className={`p-4 rounded-lg cursor-pointer transition-all ${
                  selectedMod?.name === mod.name
                    ? 'bg-indigo-900/30 border-2 border-indigo-500'
                    : 'bg-slate-900 border border-slate-700 hover:bg-slate-800'
                }`}
              >
                <div className="flex items-start justify-between mb-2">
                  <h3 className="font-bold text-white">{mod.name}</h3>
                  <div className="flex items-center gap-1">
                    <TrendingUp className={`w-4 h-4 ${getUsageColor(mod.usage)}`} />
                    <span className={`text-sm font-bold ${getUsageColor(mod.usage)}`}>
                      {mod.usage}
                    </span>
                  </div>
                </div>

                <p className="text-sm text-slate-400 mb-2">{mod.description}</p>

                <div className="flex items-center gap-2">
                  <span className="text-xs px-2 py-1 bg-slate-950 text-slate-300 rounded">
                    {mod.category}
                  </span>
                  {mod.compatibility.conflicts.length > 0 && (
                    <span className="text-xs px-2 py-1 bg-red-900/30 text-red-300 rounded flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" />
                      {mod.compatibility.conflicts.length} conflicts
                    </span>
                  )}
                </div>
              </div>
            ))}

            {sortedMods.length === 0 && (
              <div className="text-center py-12 text-slate-500">
                No mods found matching your search
              </div>
            )}
          </div>
        </div>

        {/* Details Panel */}
        <div className="flex-1 overflow-y-auto p-6">
          {selectedMod ? (
            <div className="space-y-6">
              {/* Header */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h2 className="text-2xl font-bold text-white">{selectedMod.name}</h2>
                  <div className="text-right">
                    <div className={`text-3xl font-bold ${getUsageColor(selectedMod.usage)}`}>
                      {selectedMod.usage}
                    </div>
                    <div className="text-xs text-slate-400">of players use this</div>
                  </div>
                </div>
                <p className="text-slate-300">{selectedMod.description}</p>
                <div className="mt-2">
                  <span className="text-xs px-3 py-1 bg-indigo-900/30 text-indigo-300 rounded-full">
                    {selectedMod.category}
                  </span>
                </div>
              </div>

              {/* Compatibility Tips */}
              <div className="bg-blue-900/20 border border-blue-500/50 rounded-xl p-4">
                <h3 className="font-bold text-blue-300 mb-3 flex items-center gap-2">
                  <Info className="w-5 h-5" />
                  If You're Making a Mod...
                </h3>
                <div className="space-y-2">
                  {selectedMod.compatibility.tips.map((tip, idx) => (
                    <div key={idx} className="flex items-start gap-2 text-sm text-blue-200">
                      <CheckCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-blue-400" />
                      <span>{tip}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Conflicts */}
              {selectedMod.compatibility.conflicts.length > 0 && (
                <div className="bg-red-900/20 border border-red-500/50 rounded-xl p-4">
                  <h3 className="font-bold text-red-300 mb-3 flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5" />
                    Known Conflicts
                  </h3>
                  <div className="space-y-1">
                    {selectedMod.compatibility.conflicts.map((conflict, idx) => (
                      <div key={idx} className="text-sm text-red-200 bg-red-950/30 px-3 py-2 rounded">
                        • {conflict}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Patches */}
              {selectedMod.compatibility.patches.length > 0 && (
                <div className="bg-green-900/20 border border-green-500/50 rounded-xl p-4">
                  <h3 className="font-bold text-green-300 mb-3">Available Compatibility Patches</h3>
                  <div className="space-y-1">
                    {selectedMod.compatibility.patches.map((patch, idx) => (
                      <div key={idx} className="text-sm text-green-200 bg-green-950/30 px-3 py-2 rounded">
                        ✓ {patch}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Load Order */}
              <div className="bg-slate-900 border border-slate-700 rounded-xl p-4">
                <h3 className="font-bold text-white mb-2">Load Order Recommendation</h3>
                <div className="text-sm text-slate-300 bg-slate-950 px-3 py-2 rounded font-mono">
                  {selectedMod.compatibility.loadOrder}
                </div>
              </div>

              {/* Modified Records */}
              <div className="bg-slate-900 border border-slate-700 rounded-xl p-4">
                <h3 className="font-bold text-white mb-3">Modified Records</h3>
                <div className="space-y-1">
                  {selectedMod.records.map((record, idx) => (
                    <div key={idx} className="text-xs text-slate-400 bg-slate-950 px-2 py-1 rounded font-mono">
                      {record}
                    </div>
                  ))}
                </div>
              </div>

              {/* Quick Actions */}
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    const tips = selectedMod.compatibility.tips.join('\n');
                    navigator.clipboard.writeText(tips);
                    alert('Tips copied to clipboard!');
                  }}
                  className="flex-1 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded transition-colors"
                >
                  Copy Tips
                </button>
                <button
                  onClick={() => {
                    // Build recordTypes from selected mod's records
                    const rawTypes = selectedMod.records
                      .map(r => (r.match(/[A-Z_]+/)?.[0] || ''))
                      .filter(Boolean);
                    const recordTypes = Array.from(new Set(rawTypes.filter(rt => ['WEAP','ARMO','NPC_','LVLI','AMMO','COBJ','KYWD'].includes(rt))));
                    // Risk by usage
                    const usageNum = parseInt(selectedMod.usage);
                    const risk = usageNum > 40 ? 'high' : usageNum > 20 ? 'medium' : 'low';
                    const prefill = {
                      recordTypes,
                      mods: [
                        { name: selectedMod.name, usage: selectedMod.usage, risk },
                        { name: 'YourMod', usage: '0%', risk: 'low' }
                      ]
                    };
                    localStorage.setItem('mossy_patch_prefill', JSON.stringify(prefill));
                    const event = new CustomEvent('mossy-control', {
                      detail: { action: 'navigate', payload: { path: '/patch-gen' } }
                    });
                    window.dispatchEvent(event);
                  }}
                  className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-500 text-white rounded transition-colors"
                >
                  Create Patch
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <Package className="w-16 h-16 text-slate-600 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-white mb-2">Select a Mod</h3>
                <p className="text-slate-400">Click on a mod to see compatibility details</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Stats Bar */}
      <div className="p-4 border-t border-slate-700 bg-slate-800/50">
        <div className="flex items-center justify-between text-sm">
          <div className="text-slate-400">
            Showing <span className="text-white font-bold">{sortedMods.length}</span> of{' '}
            <span className="text-white font-bold">{POPULAR_MODS.length}</span> popular mods
          </div>
          <div className="flex items-center gap-4 text-xs">
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 bg-green-400 rounded-full"></div>
              <span className="text-slate-400">70%+ usage</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
              <span className="text-slate-400">40-70% usage</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 bg-amber-400 rounded-full"></div>
              <span className="text-slate-400">20-40% usage</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
