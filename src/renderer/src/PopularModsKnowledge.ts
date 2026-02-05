// Comprehensive Fallout 4 Popular Mods Knowledge Base
// Used by AI Copilot, Patch Generator, and other components for compatibility recommendations

export interface PopularMod {
  name: string;
  category: string;
  description: string;
  compatibility: {
    conflicts: string[];
    patches: string[];
    loadOrder: string;
    tips: string[];
  };
  records: string[]; // FormIDs and record types it modifies
  usage: string; // percentage of players using it
}

export const POPULAR_MODS: PopularMod[] = [
  // Essential Fixes
  {
    name: 'Unofficial Fallout 4 Patch (UFO4P)',
    category: 'Fixes',
    description: 'Fixes thousands of bugs. Used by 90%+ of modded players.',
    compatibility: {
      conflicts: ['Mods that intentionally use vanilla bugs', 'Old mods from 2015-2016'],
      patches: [],
      loadOrder: 'Load immediately after all DLC',
      tips: [
        'MUST be loaded after all official DLC',
        'Many mods require UFO4P as a master',
        'Check if your mod relies on any bugs UFO4P fixes',
        'Update to latest version - old versions have issues'
      ]
    },
    records: ['Fixes 5000+ records across all types'],
    usage: '92%'
  },

  // Framework Mods
  {
    name: 'F4SE (Fallout 4 Script Extender)',
    category: 'Framework',
    description: 'Extends Papyrus scripting capabilities. Required by many advanced mods.',
    compatibility: {
      conflicts: [],
      patches: [],
      loadOrder: 'Not a plugin - installed to game root',
      tips: [
        'Check if your mod needs F4SE functions',
        'Always specify minimum F4SE version in requirements',
        'Test without F4SE first to verify vanilla compatibility',
        'F4SE breaks after game updates - warn users'
      ]
    },
    records: ['Adds new script functions'],
    usage: '75%'
  },

  {
    name: 'MCM (Mod Configuration Menu)',
    category: 'Framework',
    description: 'In-game settings menu for mods. Requires F4SE.',
    compatibility: {
      conflicts: [],
      patches: [],
      loadOrder: 'Mid load order',
      tips: [
        'Add MCM menu for your mod settings',
        'Users expect F4SE mods to have MCM',
        'Document all MCM options in description',
        'Provide sensible defaults'
      ]
    },
    records: ['MCM_*.pex scripts'],
    usage: '70%'
  },

  // Weapons
  {
    name: 'Modern Firearms',
    category: 'Weapons',
    description: 'Adds 100+ modern weapons. Very popular but conflicts with many weapon mods.',
    compatibility: {
      conflicts: ['Leveled list injectors without patches', 'Weapon balance overhauls', 'Ammo mods'],
      patches: ['Available for: AWKCR, VIS, Valdacil\'s Item Sorting'],
      loadOrder: 'After armor mods, before patches',
      tips: [
        'DO NOT edit vanilla weapon damage if user might have this',
        'Provide leveled list patch if you touch LL_*',
        'Consider damage values relative to Modern Firearms scale',
        'Test with and without - very common mod'
      ]
    },
    records: ['LL_*, WEAP, AMMO, MISC, COBJ'],
    usage: '45%'
  },

  {
    name: 'Weapon Balance Overhaul (WBO)',
    category: 'Weapons',
    description: 'Rebalances all weapons. Conflicts with any damage changes.',
    compatibility: {
      conflicts: ['Any mod changing weapon damage', 'Modern Firearms without patch'],
      patches: ['Modern Firearms Patch'],
      loadOrder: 'Late in load order',
      tips: [
        'If you change weapon damage, warn about WBO',
        'Consider making WBO patch',
        'Many users won\'t use your mod if it conflicts',
        'Provide "WBO Compatible" version if possible'
      ]
    },
    records: ['WEAP:Damage, WEAP:Speed, WEAP:Range'],
    usage: '35%'
  },

  // Armor & Crafting
  {
    name: 'AWKCR (Armor and Weapon Keywords Community Resource)',
    category: 'Framework',
    description: 'Standardizes armor/weapon keywords. Required by many mods.',
    compatibility: {
      conflicts: ['Mods using custom keywords without AWKCR'],
      patches: [],
      loadOrder: 'Early, after UFO4P',
      tips: [
        'USE AWKCR keywords for armor mods',
        'Check AWKCR wiki for proper keyword usage',
        'List AWKCR as requirement if you use its keywords',
        '50% of players have this - consider supporting it'
      ]
    },
    records: ['KYWD:ap_*, KYWD:dn_*'],
    usage: '52%'
  },

  {
    name: 'Armorsmith Extended',
    category: 'Armor',
    description: 'Expands armor crafting. Requires AWKCR.',
    compatibility: {
      conflicts: ['Armor bench changes', 'Armor slot conflicts'],
      patches: ['Most armor mods have patches'],
      loadOrder: 'After AWKCR',
      tips: [
        'If you add armor, make Armorsmith patch',
        'Use AWKCR keywords for auto-compatibility',
        'Test armor slots for conflicts',
        'Document which slots your armor uses'
      ]
    },
    records: ['ARMO, COBJ, KYWD'],
    usage: '40%'
  },

  // Settlement Mods
  {
    name: 'Sim Settlements 2',
    category: 'Settlements',
    description: 'Massive settlement overhaul. Scripts run constantly.',
    compatibility: {
      conflicts: ['Heavy script mods', 'Settlement object replacers'],
      patches: ['Many available'],
      loadOrder: 'Early-mid load order',
      tips: [
        'Test with SS2 running - it\'s script-heavy',
        'If your mod adds settlement items, provide SS2 plot',
        'Don\'t edit workshop scripts without SS2 knowledge',
        'Performance: SS2 users already have low FPS'
      ]
    },
    records: ['Workshop:*, Quest:*, Massive scripts'],
    usage: '38%'
  },

  {
    name: 'Place Everywhere',
    category: 'Settlements',
    description: 'Removes settlement building restrictions.',
    compatibility: {
      conflicts: [],
      patches: [],
      loadOrder: 'Any',
      tips: [
        'If you add settlement objects, they work with this',
        'Users may place objects in unexpected ways',
        'Test collision and snapping',
        'Very popular with settlement builders'
      ]
    },
    records: [],
    usage: '55%'
  },

  // Gameplay
  {
    name: 'Survival Options',
    category: 'Gameplay',
    description: 'Customizes survival mode. F4SE required.',
    compatibility: {
      conflicts: ['Mods that force survival settings'],
      patches: [],
      loadOrder: 'Mid-late',
      tips: [
        'Don\'t force survival settings in scripts',
        'Check if survival mode affects your mod',
        'Test both normal and survival',
        '60% of mod users play survival'
      ]
    },
    records: ['GameSettings:*'],
    usage: '42%'
  },

  // Visuals
  {
    name: 'Vivid Fallout - All in One',
    category: 'Graphics',
    description: 'Retextures everything. 2K/4K versions.',
    compatibility: {
      conflicts: ['Other texture packs for same objects'],
      patches: [],
      loadOrder: 'Textures = load order doesn\'t matter',
      tips: [
        'If you include textures, note Vivid compatibility',
        'Users may want to use Vivid instead',
        'Provide loose files option for easy override',
        'Consider file sizes - users may have 2K version'
      ]
    },
    records: ['Textures only'],
    usage: '48%'
  },

  {
    name: 'ENB',
    category: 'Graphics',
    description: 'Graphics injector. Can cause issues with some mods.',
    compatibility: {
      conflicts: ['ReShade', 'Some HUD mods'],
      patches: [],
      loadOrder: 'Not a plugin',
      tips: [
        'Test your mod with ENB enabled',
        'Check if HUD elements display correctly',
        'Transparency effects may look different',
        'Many users have ENB - screenshot with it'
      ]
    },
    records: ['Graphics injector'],
    usage: '35%'
  },

  // UI
  {
    name: 'FallUI - HUD/Workbench/etc',
    category: 'UI',
    description: 'Complete UI overhaul. F4SE required.',
    compatibility: {
      conflicts: ['Other HUD mods', 'DEF_UI without patch'],
      patches: ['DEF_UI integration'],
      loadOrder: 'Load order matters for UI',
      tips: [
        'If you add HUD elements, test with FallUI',
        'Follow HUD widget standards',
        'Many users prefer FallUI over vanilla',
        'Check widget positioning'
      ]
    },
    records: ['UI files: HUDMenu.swf, etc'],
    usage: '40%'
  },

  // AI & NPCs
  {
    name: 'Better Locational Damage',
    category: 'Gameplay',
    description: 'Adds headshot multipliers and dismemberment. Changes combat drastically.',
    compatibility: {
      conflicts: ['Combat overhauls', 'Damage mods'],
      patches: [],
      loadOrder: 'Late load order',
      tips: [
        'Test damage values with BLD active',
        'Headshots deal 3-5x damage with this',
        'Your enemy health may need adjustment',
        'Very popular for combat mods'
      ]
    },
    records: ['GMST:fDamage*, Perk effects'],
    usage: '38%'
  },

  // Load Order Tools
  {
    name: 'LOOT (Load Order Optimization Tool)',
    category: 'Utility',
    description: 'Auto-sorts load order. 95% of users have this.',
    compatibility: {
      conflicts: [],
      patches: [],
      loadOrder: 'External tool',
      tips: [
        'Add LOOT metadata to your mod',
        'Specify load order requirements in metadata',
        'Test your suggested load position',
        'Users will run LOOT - plan for it'
      ]
    },
    records: ['External tool'],
    usage: '95%'
  }
];

export const MOD_CATEGORIES = [
  'Fixes',
  'Framework',
  'Weapons',
  'Armor',
  'Settlements',
  'Gameplay',
  'Graphics',
  'UI',
  'Utility'
];

// Helper functions
export function getModsByCategory(category: string): PopularMod[] {
  return POPULAR_MODS.filter(mod => mod.category === category);
}

export function getModByName(name: string): PopularMod | undefined {
  return POPULAR_MODS.find(mod => 
    mod.name.toLowerCase().includes(name.toLowerCase())
  );
}

export function getCompatibilityTips(userModType: string): string[] {
  const tips: string[] = [];
  
  if (userModType.includes('weapon')) {
    tips.push('⚠️ 45% of users have Modern Firearms - test compatibility');
    tips.push('⚠️ 35% use Weapon Balance Overhaul - consider not changing damage');
    tips.push('💡 Use AWKCR keywords if adding new weapons');
    tips.push('💡 Provide leveled list patch or use AWKCR integration');
  }
  
  if (userModType.includes('armor')) {
    tips.push('⚠️ 52% have AWKCR - USE their keywords');
    tips.push('⚠️ 40% have Armorsmith Extended - make a patch');
    tips.push('💡 Document which armor slots you use');
    tips.push('💡 Test with VIS-G for inventory compatibility');
  }
  
  if (userModType.includes('settlement')) {
    tips.push('⚠️ 38% use Sim Settlements 2 - test performance');
    tips.push('⚠️ 55% have Place Everywhere - expect unusual placement');
    tips.push('💡 Provide SS2 plot if adding buildable items');
    tips.push('💡 Make sure objects have proper workshop categories');
  }
  
  if (userModType.includes('script') || userModType.includes('gameplay')) {
    tips.push('⚠️ 75% have F4SE - consider using extended functions');
    tips.push('⚠️ 70% expect MCM - add config menu');
    tips.push('⚠️ 42% use Survival Options - don\'t force settings');
    tips.push('💡 Test script load with SS2 running');
  }
  
  if (userModType.includes('texture') || userModType.includes('visual')) {
    tips.push('⚠️ 48% use Vivid Fallout textures - note this in description');
    tips.push('⚠️ 35% have ENB - test visual effects');
    tips.push('💡 Provide 2K and 4K options');
    tips.push('💡 Include compatibility with popular texture packs');
  }
  
  if (userModType.includes('ui') || userModType.includes('hud')) {
    tips.push('⚠️ 40% use FallUI - test HUD positioning');
    tips.push('⚠️ DEF_UI is common - check compatibility');
    tips.push('💡 Follow HUD widget standards');
    tips.push('💡 Provide customization options');
  }
  
  // Universal tips
  tips.push('✅ 92% have UFO4P - make sure it\'s a master');
  tips.push('✅ 95% use LOOT - add proper metadata');
  
  return tips;
}

export function checkConflicts(recordTypes: string[]): { mod: PopularMod; risk: 'high' | 'medium' | 'low' }[] {
  const conflicts: { mod: PopularMod; risk: 'high' | 'medium' | 'low' }[] = [];
  
  POPULAR_MODS.forEach(mod => {
    const hasConflict = mod.records.some(record => 
      recordTypes.some(type => record.includes(type))
    );
    
    if (hasConflict) {
      const usage = parseInt(mod.usage);
      const risk = usage > 40 ? 'high' : usage > 20 ? 'medium' : 'low';
      conflicts.push({ mod, risk });
    }
  });
  
  return conflicts.sort((a, b) => {
    const usageA = parseInt(a.mod.usage);
    const usageB = parseInt(b.mod.usage);
    return usageB - usageA;
  });
}

// Common mod pair conflict generator for one-click patching
export interface DemoConflict {
  record: string;
  type: string;
  modA: { name: string; value: string };
  modB: { name: string; value: string };
}

export function generateTailoredConflicts(modAName: string, modBName: string): DemoConflict[] {
  const conflicts: DemoConflict[] = [];
  const modA = getModByName(modAName);
  const modB = getModByName(modBName);
  
  if (!modA || !modB) return conflicts;
  
  const modALower = modA.name.toLowerCase();
  const modBLower = modB.name.toLowerCase();
  
  // WBO + Modern Firearms: weapon balance and leveled list conflicts
  if ((modALower.includes('weapon balance') && modBLower.includes('modern')) || 
      (modALower.includes('modern') && modBLower.includes('weapon balance'))) {
    conflicts.push(
      { record: 'WEAP:0001F669 (10mm Pistol)', type: 'Weapon', modA: { name: modA.name, value: 'Damage: 20 → 30 (balanced)' }, modB: { name: modB.name, value: 'Damage: 20 → 35 (modern)' } },
      { record: 'WEAP:0001F66A (Pipe Rifle)', type: 'Weapon', modA: { name: modA.name, value: 'Speed: 0.85 → 0.75' }, modB: { name: modB.name, value: 'Range: 0.8 → 1.0' } },
      { record: 'LVLI:0001F66C (LootGeneral)', type: 'Leveled List', modA: { name: modA.name, value: 'Removed Modern Firearms' }, modB: { name: modB.name, value: 'Added 15 new weapons' } }
    );
  }
  
  // AWKCR + Armor mod: keyword conflicts
  if ((modALower.includes('awkcr') && modBLower.includes('armor')) || 
      (modALower.includes('armor') && modBLower.includes('awkcr'))) {
    conflicts.push(
      { record: 'KYWD:ap_clothes (Clothing)', type: 'Keyword', modA: { name: modA.name, value: 'AWKCR standard set' }, modB: { name: modB.name, value: 'Custom armor keywords' } },
      { record: 'ARMO:000E5881 (Leather Armor)', type: 'Armor', modA: { name: modA.name, value: 'Slots: 32,34 (AWKCR)' }, modB: { name: modB.name, value: 'Slots: 32,33,52' } }
    );
  }
  
  // Sim Settlements 2 + Settlement objects: script/quest conflicts
  if ((modALower.includes('sim settlements') && modBLower.includes('settlement')) ||
      (modALower.includes('settlement') && modBLower.includes('sim settlements'))) {
    conflicts.push(
      { record: 'Quest:WorkshopBuild', type: 'Quest', modA: { name: modA.name, value: 'Custom quest stages' }, modB: { name: modB.name, value: 'Workshop object events' } },
      { record: 'OMOD:WorkshopObjects', type: 'Workshop Mod', modA: { name: modA.name, value: 'SS2 plot management' }, modB: { name: modB.name, value: 'Direct object placement' } }
    );
  }
  
  // Fallback: use record types from mods
  if (conflicts.length === 0) {
    const types = new Set<string>();
    modA.records.forEach(r => {
      const t = r.match(/[A-Z_]+/)?.[0];
      if (t) types.add(t);
    });
    modB.records.forEach(r => {
      const t = r.match(/[A-Z_]+/)?.[0];
      if (t) types.add(t);
    });
    
    const typeArray = Array.from(types).slice(0, 3);
    if (typeArray.length > 0) {
      typeArray.forEach((type, idx) => {
        conflicts.push({
          record: `${type}:${String(idx + 1).padStart(8, '0')} (Demo)`,
          type,
          modA: { name: modA.name, value: `Modified ${type} record` },
          modB: { name: modB.name, value: `Also modified ${type}` }
        });
      });
    }
  }
  
  return conflicts;
}
