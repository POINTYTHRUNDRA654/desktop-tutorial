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
    name: 'MCM NG (Mod Configuration Menu — Next Gen)',
    category: 'Framework',
    description: 'In-game settings menu for mods. Required by FallUI, many QoL mods. Use the NG build — the legacy MCM Framework does not work on NG or 1.11.x.',
    compatibility: {
      conflicts: [],
      patches: [],
      loadOrder: 'Mid load order',
      tips: [
        'Always use MCM NG — the legacy MCM Framework is broken on NG and 1.11.x',
        'Add MCM menu for your mod settings — users expect it',
        'Document all MCM options in your mod description',
        'Provide sensible defaults so users can enable your mod without touching MCM'
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
    name: 'AWKCR (Armor and Weapon Keywords Community Resource) [LEGACY]',
    category: 'Framework',
    description: '⚠️ LEGACY — No longer actively maintained (2024+). Many mods that required AWKCR now have AWKCR-free versions. New mods should NOT depend on AWKCR; use standalone keywords or ECO instead.',
    compatibility: {
      conflicts: ['Mods using custom keywords without AWKCR'],
      patches: [],
      loadOrder: 'Early, after UFO4P',
      tips: [
        'DO NOT add new AWKCR dependencies — it is no longer maintained',
        'If your existing mod uses AWKCR, look into releasing an AWKCR-free version',
        'Check if the mods that require AWKCR have updated standalone versions on Nexus',
        'For new keyword frameworks, consider ECO (Equipment and Crafting Overhaul) as an alternative'
      ]
    },
    records: ['KYWD:ap_*, KYWD:dn_*'],
    usage: '35%'
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
    name: 'FallUI Suite (HUD / Inventory / Map)',
    category: 'UI',
    description: 'Modular UI overhaul: FallUI HUD lets every widget be independently moved/configured in-game. FallUI Inventory overhauls item management. FallUI Map overhauls the Pip-Boy map. Requires F4SE + MCM NG. Must use NG-compatible build (1.10.980+ / 1.11.x).',
    compatibility: {
      conflicts: ['DEF_UI (alternative — choose one)', 'Other full HUD replacers'],
      patches: [],
      loadOrder: 'Any',
      tips: [
        'Always use the NG build of FallUI — legacy builds break on 1.10.980+ and 1.11.x',
        'If you add HUD elements, test with FallUI — widget positions may conflict',
        'FallUI Inventory changes sorting — document any custom item names your mod adds',
        'Requires MCM NG — do not use the legacy MCM Framework'
      ]
    },
    records: ['Interface files, F4SE plugin'],
    usage: '55%'
  },

  // Stability & Crash Tools (2025+)
  {
    name: 'Addictol (ALL-IN-ONE stability tool)',
    category: 'Framework',
    description: 'ALL-IN-ONE engine patch suite for OG/NG/1.11.x. Supersedes and includes Buffout 4 (all variants), X-Cell, BakaMaxPapyrusOps, Faster Workshop, Interior NavCut Fix, Escape Freeze, Long Save Bug Fix, Disk Cache Enabler, Drop 7FFF Fix, and more. Do NOT install Buffout 4, X-Cell, or any of those mods alongside Addictol. Nexus #84214.',
    compatibility: {
      conflicts: [
        'Buffout 4 (all variants) — superseded by Addictol',
        'X-Cell — superseded by Addictol',
        'BakaMaxPapyrusOps — included in Addictol',
        'Faster Workshop / NG / AE — included in Addictol',
        'Interior NavCut Fix — included in Addictol',
        'Escape Freeze OG/NG — included in Addictol',
        'Long Save Bug Fix — included in Addictol',
        'Disk Cache Enabler — included in Addictol',
        'Drop 7FFF Fix — included in Addictol',
        'Baka ScrapHeap — superseded',
        'Fallout Priority — superseded',
        'Private Profile Redirector — superseded',
      ],
      patches: [],
      loadOrder: 'Loads via F4SE automatically — no manual load order position needed',
      tips: [
        'Addictol is the ALL-IN-ONE stability tool — install it on every OG/NG/1.11.x setup',
        'Do NOT install Buffout 4, X-Cell, or any of the superseded mods alongside Addictol',
        'Requires: F4SE + Address Library AiO (Nexus #47327)',
        'Configure via Addictol.toml — see the mod page for all [Patches], [Fixes], and [Additional] options',
        'Crash logs are written to %LOCALAPPDATA%\\Fallout4\\F4SE\\ — run CLASSIC on them'
      ]
    },
    records: ['F4SE plugin (.dll)'],
    usage: '75%'
  },

  {
    name: 'CLASSIC (Crash Log Auto Scanner)',
    category: 'Utility',
    description: 'Scans crash logs (written to %LOCALAPPDATA%\\Fallout4\\F4SE\\ by Addictol) and checks setup integrity. Covers 250+ error scenarios with recommended fixes. Validates F4SE, Address Library, and dependency versions. Run it after every CTD. Nexus #56255.',
    compatibility: {
      conflicts: [],
      patches: [],
      loadOrder: 'External tool',
      tips: [
        'Run CLASSIC on every CTD before asking for help — it identifies the root cause automatically',
        'Validates that Addictol, F4SE, and Address Library are correctly installed',
        'Also checks for corrupt mod files and missing assets'
      ]
    },
    records: ['External tool'],
    usage: '60%'
  },

  {
    name: 'Canary Save Scummer',
    category: 'Utility',
    description: 'Save file health checker. Detects corruption and warns when save data references removed/changed mods. Essential for heavily-modded setups where save bloat is a common risk.',
    compatibility: {
      conflicts: [],
      patches: [],
      loadOrder: 'Any',
      tips: [
        'Install before starting a modded playthrough — it needs to be active from the first save',
        'Warns early when mods are removed mid-playthrough without proper cleanup'
      ]
    },
    records: ['F4SE plugin'],
    usage: '35%'
  },

  {
    name: 'High FPS Physics Fix',
    category: 'Framework',
    description: 'Fixes physics bugs, script misfires, and broken game mechanics when running above 60 FPS. v0.8.13+ for NG/1.11.x. Install even if you cap at 60 FPS — it resolves subtle timing edge cases. Nexus #44798.',
    compatibility: {
      conflicts: [],
      patches: [],
      loadOrder: 'Loads automatically via F4SE',
      tips: [
        'Critical for anyone playing above 60 FPS — without it physics breaks, doors misbehave, and scripts misfire',
        'Requires F4SE and Address Library',
        'Use v0.8.13+ on NG/1.11.x'
      ]
    },
    records: ['F4SE plugin (.dll)'],
    usage: '65%'
  },

  {
    name: 'BakaMaxPapyrusOps (BakaFramework)',
    category: 'Framework',
    description: 'Advanced F4SE Papyrus script function expansions. Required by many NG-era mods including FallUI components and settlement frameworks. Always use the version matching your F4SE build.',
    compatibility: {
      conflicts: [],
      patches: [],
      loadOrder: 'Any',
      tips: [
        'Match version to your F4SE build exactly',
        'Required by FallUI, MCM NG, and many NG-era settlement mods',
        'Check the mod page for the correct version for your game runtime'
      ]
    },
    records: ['F4SE plugin'],
    usage: '42%'
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
    description: 'Auto-sorts load order. 95% of users have this. Use LOOT 0.21+ for NG/1.11.x support.',
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
    tips.push('💡 AWKCR is legacy (unmaintained 2024+) - do NOT add new AWKCR dependencies');
    tips.push('💡 Provide leveled list patch for compatibility with weapon overhauls');
  }
  
  if (userModType.includes('armor')) {
    tips.push('⚠️ AWKCR is legacy/unmaintained — check if target users still need AWKCR support or use a standalone keyword approach');
    tips.push('⚠️ 40% have Armorsmith Extended - make a patch');
    tips.push('💡 Document which armor slots you use');
    tips.push('💡 Test with VIS-G for inventory compatibility');
  }
  
  if (userModType.includes('settlement')) {
    tips.push('⚠️ 38% use Sim Settlements 2 - test performance');
    tips.push('⚠️ 55% have Place Everywhere - expect unusual placement');
    tips.push('⚠️ Settlement mods often introduce navmesh — scan your ESP in the Auditor for deleted NAVM records before release');
    tips.push('💡 Provide SS2 plot if adding buildable items');
    tips.push('💡 Make sure objects have proper workshop categories');
  }
  
  if (userModType.includes('script') || userModType.includes('gameplay')) {
    tips.push('⚠️ 75% have F4SE - consider using extended functions');
    tips.push('⚠️ 70% expect MCM NG (not legacy MCM) - use the NG build');
    tips.push('⚠️ 42% use Survival Options - don\'t force settings');
    tips.push('💡 Test script load with SS2 running');
    tips.push('💡 Include Addictol (Nexus #84214) and Address Library in recommended requirements if using F4SE');
  }

  if (userModType.includes('physics') || userModType.includes('animation')) {
    tips.push('⚠️ 65% use High FPS Physics Fix - test at high framerates');
    tips.push('⚠️ Physics behavior differs above 60 FPS without the fix - document this');
  }
  
  if (userModType.includes('texture') || userModType.includes('visual')) {
    tips.push('⚠️ 48% use Vivid Fallout textures - note this in description');
    tips.push('⚠️ 35% have ENB - test visual effects');
    tips.push('💡 Provide 2K and 4K options');
    tips.push('💡 Include compatibility with popular texture packs');
  }
  
  if (userModType.includes('ui') || userModType.includes('hud')) {
    tips.push('⚠️ 55% use FallUI Suite (NG build) - test HUD widget positioning');
    tips.push('⚠️ Always use MCM NG, not the legacy MCM Framework');
    tips.push('💡 Follow FallUI widget standards for new HUD elements');
    tips.push('💡 Provide customization options via MCM NG');
  }

  if (userModType.includes('worldspace') || userModType.includes('location') || userModType.includes('cell')) {
    tips.push('⚠️ Worldspace mods may break precombines — test with PRP 81.5+ (Nexus #46403)');
    tips.push('⚠️ Scan your ESP in the Auditor for deleted navmesh (NAVM) records before release');
    tips.push('💡 Run Check for Errors in xEdit after editing cells — look for [D] NAVM records');
  }
  
  // Universal tips
  tips.push('✅ 92% have UFO4P - make sure it\'s compatible');
  tips.push('✅ 95% use LOOT 0.21+ - add proper metadata');
  tips.push('✅ Always specify which game version your mod targets: OG (1.10.163), NG (1.10.980+), or 1.11.x (1.11.169+)');
  tips.push('⚠️ Addictol (Nexus #84214) is the ALL-IN-ONE stability tool — if advising users on crashes, confirm Addictol is installed and Buffout 4 / X-Cell are NOT also installed');
  tips.push('⚠️ Do NOT recommend Baka ScrapHeap, Fallout Priority, Private Profile Redirector, or Buffout 4 alongside Addictol — they are all superseded');
  
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
