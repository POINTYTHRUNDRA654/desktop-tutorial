/**
 * CK Crash Engine — Pure client-side crash analysis and prevention planning.
 *
 * This module contains only logic that runs entirely in the renderer process
 * with no Electron IPC or file-system access required:
 *   - analyzeCrashLogText()    — instant crash-log pattern analysis from pasted text
 *   - generatePreventionPlan() — prevention step generator from validation context
 *
 * Operations that need file-system or process access (validateBeforeCK,
 * collectProcessMetrics, etc.) are handled by the main process via IPC in
 * src/mining/ckCrashPrevention.ts and exposed through preload.ts.
 */

// ─── Shared interfaces ────────────────────────────────────────────────────────

export type CrashType =
  | 'memory_overflow'
  | 'access_violation'
  | 'navmesh_conflict'
  | 'precombine_corrupt'
  | 'stack_overflow'
  | 'missing_asset'
  | 'script_error'
  | 'version_mismatch'
  | 'deprecated_framework'
  | 'ba2_header_mismatch'
  | 'mcm_conflict'
  | 'sim_settlements_error'
  | 'papyrus_script_overflow'
  | 'loose_file_conflict'
  | 'lod_data_corrupt'
  | 'f4se_plugin_crash'
  | 'audio_stream_crash'
  | 'unknown';

export interface CrashDiagnosis {
  crashType: CrashType;
  rootCause: string;
  affectedComponent: string;
  stackTrace?: string[];
  recommendations: string[];
  preventable: boolean;
  relatedIssues: string[];
  confidence: 'high' | 'medium' | 'low';
}

export interface ValidationIssue {
  type:
    | 'missing_master'
    | 'corrupted_record'
    | 'memory_intensive'
    | 'navmesh_conflict'
    | 'script_error'
    | 'form_id_conflict'
    | 'deprecated_framework'
    | 'esl_formid_overflow';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  affectedRecords?: string[];
  solution: string;
}

export interface PreventionStep {
  order: number;
  action: string;
  description: string;
  automated: boolean;
  tool?: string;
  command?: string;
}

export interface PreventionPlan {
  steps: PreventionStep[];
  estimatedRiskReduction: number; // 0–100
  estimatedTime: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
}

export interface ModContext {
  pluginName?: string;
  pluginPath?: string;
  fileSize?: number;
  recordCount?: number;
  hasNavmesh?: boolean;
  hasPrecombines?: boolean;
  hasScripts?: boolean;
  masterCount?: number;
  crashRisk?: number;
  issues?: ValidationIssue[];
  previousCrashTypes?: CrashType[];
  gameVersion?: 'og' | 'ng' | 'ae' | '1.11.x';
}

// ─── Crash log text analysis ──────────────────────────────────────────────────

/**
 * Analyse a raw crash log string and return a structured diagnosis.
 * Works entirely client-side — no file system access needed.
 * Pass the full text content of a Buffout 4 / Addictol / X-Cell crash log.
 */
export function analyzeCrashLogText(logContent: string): CrashDiagnosis {
  if (!logContent || !logContent.trim()) {
    return {
      crashType: 'unknown',
      rootCause: 'No log content provided.',
      affectedComponent: 'Unknown',
      recommendations: ['Paste or load a crash log to begin analysis.'],
      preventable: false,
      relatedIssues: [],
      confidence: 'low',
    };
  }

  const log = logContent.toLowerCase();

  // ── NG/AE version mismatch ─────────────────────────────────────────────────
  if (
    (log.includes('rel::id') || log.includes('relocationmanager') || log.includes('baseaddress')) &&
    (log.includes('0xc0000005') || log.includes('access violation'))
  ) {
    return {
      crashType: 'version_mismatch',
      rootCause:
        'F4SE plugin using a hardcoded memory offset that is invalid on your game version. ' +
        'Typically caused by a plugin compiled for OG (1.10.163) running on NG/AE or vice versa.',
      affectedComponent: 'F4SE Plugin (DLL)',
      stackTrace: extractStackTrace(logContent),
      recommendations: [
        '🔍 Identify the faulting DLL in the call stack (look for lines ending in .dll)',
        '🔄 Download the correct NG or AE build of that plugin from Nexus',
        '📚 Ensure Address Library "All In One (Anniversary Edition)" is installed for NG/AE',
        '⚠️ If on 1.11.x: check f4se.silverlock.org — F4SE 0.7.7+ required; Address Library AiO AE build required',
        '🚫 If crash mentions Buffout 4 and Addictol together: remove standalone Buffout 4 — Addictol includes it',
      ],
      preventable: true,
      relatedIssues: [
        'Wrong Address Library build installed',
        'Plugin compiled for different runtime',
        'Outdated F4SE DLL',
      ],
      confidence: 'high',
    };
  }

  // ── Deprecated framework (AWKCR workbench crash) ───────────────────────────
  if (
    log.includes('workbench') ||
    (log.includes('awkcr') || log.includes('armorsmith')) ||
    (log.includes('keywordform') && log.includes('0xc0000005'))
  ) {
    return {
      crashType: 'deprecated_framework',
      rootCause:
        'Deprecated armor/weapon keyword framework (likely AWKCR) has broken keyword linkages. ' +
        'AWKCR is incompatible with NG/AE load orders.',
      affectedComponent: 'Armor/Weapon Keyword System (AWKCR)',
      stackTrace: extractStackTrace(logContent),
      recommendations: [
        '🚫 Remove AWKCR and Armorsmith Extended from your load order',
        '✅ Replace with ECO (Equipment & Crafting Overhaul) or NEO (New Equipment Overhaul)',
        '🛠️ Open any mods that depended on AWKCR in xEdit and re-map their COBJ recipe keywords to ECO/vanilla keywords',
        '🔍 Run xEdit → Check for Errors to find remaining AWKCR FormID references',
      ],
      preventable: true,
      relatedIssues: [
        'Armorsmith Extended dependency on AWKCR',
        'Mods with AWKCR masters need re-patching',
        'Save bloat from AWKCR keyword arrays',
      ],
      confidence: 'high',
    };
  }

  // ── DEF_UI / Flash UI crash ────────────────────────────────────────────────
  if (
    log.includes('def_ui') ||
    log.includes('def_hud') ||
    log.includes('scaleform') ||
    (log.includes('.swf') && log.includes('0xc0000005'))
  ) {
    return {
      crashType: 'deprecated_framework',
      rootCause:
        'DEF_UI or DEF_HUD is loading legacy 2015 Flash (.swf) interface files that are incompatible with the NG/AE UI engine.',
      affectedComponent: 'Scaleform/Flash UI System',
      stackTrace: extractStackTrace(logContent),
      recommendations: [
        '🚫 Remove DEF_UI and DEF_HUD from your load order completely',
        '✅ Install FallUI Suite: FallUI - HUD (Nexus #51813) + FallUI - Inventory',
        '🔄 These are NG/AE-native replacements with identical features',
      ],
      preventable: true,
      relatedIssues: [
        'Any mod that ships .swf files in Interface/ folder',
        'Old MCM Framework DLL (also incompatible — use MCM NG instead)',
      ],
      confidence: 'high',
    };
  }

  // ── Memory overflow ────────────────────────────────────────────────────────
  if (
    log.includes('out of memory') ||
    log.includes('std::bad_alloc') ||
    log.includes('memory allocation failed') ||
    log.includes('heap') && log.includes('corrupt')
  ) {
    return {
      crashType: 'memory_overflow',
      rootCause:
        'Creation Kit (32-bit) or the game exceeded available memory. ' +
        'Common when editing large worldspaces or when too many masters are loaded.',
      affectedComponent: 'Memory Manager',
      stackTrace: extractStackTrace(logContent),
      recommendations: [
        '💾 Save more frequently (every 10–15 minutes) in smaller sessions',
        '🔄 Restart CK every 30–45 minutes to reclaim memory',
        '🛑 Disable precombines before editing large exterior cells',
        '⚙️ Close all other applications before opening CK',
        '📦 Use CKPE (Nexus #51998) — it patches several CK memory leaks',
        '🔧 For game crashes: ensure Addictol (Nexus #84214) is installed; includes memory fixes',
      ],
      preventable: true,
      relatedIssues: [
        'Large plugin with many cell edits',
        'Complex worldspace with many placed objects',
        'Multiple master files loaded simultaneously',
      ],
      confidence: 'high',
    };
  }

  // ── Access violation (navmesh) ─────────────────────────────────────────────
  if (
    (log.includes('access violation') || log.includes('0xc0000005')) &&
    (log.includes('navmesh') || log.includes('navm') || log.includes('pathfind'))
  ) {
    return {
      crashType: 'navmesh_conflict',
      rootCause:
        'Invalid navmesh operation — commonly caused by dragging large navmesh sections, ' +
        'deleting triangles directly, or finalizing navmesh with corrupt triangles.',
      affectedComponent: 'Navmesh Editor',
      stackTrace: extractStackTrace(logContent),
      recommendations: [
        '💾 Always save immediately before any navmesh operation',
        '✂️ Use the navmesh Cut tool instead of deleting triangles directly',
        '🔄 Regenerate navmesh in the affected cell if corruption is suspected (CK: Navmesh → Finalize Cell)',
        '🔍 Open the plugin in xEdit and check for deleted NAVM records (UDR) — undelete them',
        '🛡️ Install CKPE (Nexus #51998) — it patches the navmesh crash on large cells',
      ],
      preventable: true,
      relatedIssues: [
        'Overlapping navmesh triangles',
        'Invalid navmesh finalization',
        'Deleted navmesh records (UDR) causing CTD on load',
      ],
      confidence: 'high',
    };
  }

  // ── Access violation (precombines) ────────────────────────────────────────
  if (
    (log.includes('access violation') || log.includes('0xc0000005')) &&
    (log.includes('precombine') || log.includes('previs') || log.includes('pgre'))
  ) {
    return {
      crashType: 'precombine_corrupt',
      rootCause:
        'Precombine or previs data is corrupt or missing. ' +
        'Occurs when a mod edits exterior cells without regenerating precombine geometry.',
      affectedComponent: 'Precombine/Previs System',
      stackTrace: extractStackTrace(logContent),
      recommendations: [
        '📦 Install PRP (Previsibines Repair Pack, Nexus #46403) — use v81.5+ for NG/AE/1.11.x',
        '🔍 Load after all worldspace-editing mods in your load order',
        '⚠️ If you edit cells in CK: regenerate precombines (File → Generate Precombined Geometry) before shipping',
        '🛑 Never disable bEnablePrecombinedObjects in Fallout4.ini without regenerating',
      ],
      preventable: true,
      relatedIssues: [
        'Worldspace edits without precombine rebuild',
        'PRP not installed or out of date',
        'Load order placing PRP too early',
      ],
      confidence: 'high',
    };
  }

  // ── Stack overflow ─────────────────────────────────────────────────────────
  if (
    log.includes('stack overflow') ||
    log.includes('0xc00000fd') ||
    log.includes('stack_overflow')
  ) {
    return {
      crashType: 'stack_overflow',
      rootCause:
        'Infinite recursion or deeply nested operations in Papyrus scripts or quest alias chains.',
      affectedComponent: 'Script System / Quest Aliases',
      stackTrace: extractStackTrace(logContent),
      recommendations: [
        '🔍 Check for circular script references (Script A calls Script B which calls Script A)',
        '📋 Review quest aliases — very deep alias chains can overflow the call stack',
        '⛔ Replace any RegisterForUpdate() loops with event-driven handlers (RegisterForRemoteEvent, etc.)',
        '🔍 Open the crash log in CLASSIC (Nexus #56255) for automated pattern matching',
        '⚙️ Ensure Addictol (Nexus #84214) is installed — includes Papyrus VM fixes',
      ],
      preventable: true,
      relatedIssues: [
        'RegisterForUpdate() infinite loop',
        'Circular script dependencies',
        'Oversized quest alias chains',
      ],
      confidence: 'medium',
    };
  }

  // ── Missing asset ──────────────────────────────────────────────────────────
  if (
    log.includes('file not found') ||
    log.includes('missing') && (log.includes('.nif') || log.includes('.dds') || log.includes('.pex') || log.includes('.ba2')) ||
    log.includes('failed to load')
  ) {
    return {
      crashType: 'missing_asset',
      rootCause:
        'A required asset file (mesh, texture, script, or sound) is missing from the Data folder.',
      affectedComponent: 'Asset Loader',
      stackTrace: extractStackTrace(logContent),
      recommendations: [
        '🔍 Check the log for the specific filename causing the crash (search for ".nif" or ".dds" near the error)',
        '📦 Verify all mod dependencies are installed and enabled in your mod manager',
        '🔄 For BA2 archives: ensure the mod\'s BA2 file is enabled in your mod manager, not just the plugin',
        '🔑 Check BA2 header version — pre-NG BA2s (Header V1) may fail on NG/AE; repack with Archive2 v2+',
        '🛡️ Run Archive Invalidation if using loose files alongside BA2 archives',
      ],
      preventable: true,
      relatedIssues: [
        'BA2 header version mismatch (V1 vs V2)',
        'Mod dependency not installed',
        'Loose files overridden by BA2',
      ],
      confidence: 'medium',
    };
  }

  // ── BA2 header version mismatch (V7/V8 on OG game, or V1 on NG) ───────────
  if (
    (log.includes('ba2') || log.includes('archive2') || log.includes('bsarchive')) &&
    (log.includes('version') || log.includes('header') || log.includes('unsupported') || log.includes('0xc0000005'))
  ) {
    return {
      crashType: 'ba2_header_mismatch',
      rootCause:
        'BA2 archive header version mismatch. The NG Creation Kit produces Header V7/V8 archives ' +
        'that the OG game (1.10.163) cannot load. Conversely, old V1 archives may fail on 1.11.x.',
      affectedComponent: 'BA2 Archive System (Archive2)',
      stackTrace: extractStackTrace(logContent),
      recommendations: [
        '🔑 Identify which BA2 file is causing the crash — look for .ba2 filenames near the error',
        '🔄 If on OG (1.10.163): repack the BA2 using Archive2 with explicit "--formatVersion=1" flag',
        '🔄 If on NG/AE (1.10.982+): repack with Archive2 v2+ shipped with the NG CK (no flag needed)',
        '📋 Run xEdit and check the BA2 file list in the mod manager — ensure all are same version family',
        '⚙️ Consider shipping two BA2 files: one V1 (OG) and one V7 (NG) with a FOMOD selector',
        '🛡️ General/Textures type BA2s must match — mixing OG textures in NG general archives causes this',
      ],
      preventable: true,
      relatedIssues: [
        'NG CK default output is V7/V8 — incompatible with OG',
        'Old mods built with OG Archive2 fail on NG renderer',
        'DDS compression format changes between OG and NG (BC7 requires NG)',
      ],
      confidence: 'high',
    };
  }

  // ── MCM conflict (legacy MCM DLL vs MCM NG) ────────────────────────────────
  if (
    (log.includes('mcm') || log.includes('modconfigurationmenu') || log.includes('mod configuration menu')) &&
    (log.includes('0xc0000005') || log.includes('failed') || log.includes('crash') || log.includes('dll'))
  ) {
    return {
      crashType: 'mcm_conflict',
      rootCause:
        'MCM (Mod Configuration Menu) conflict — the legacy MCM DLL is incompatible with NG/1.11.x. ' +
        'Both the legacy and MCM NG versions cannot be installed simultaneously.',
      affectedComponent: 'MCM Framework DLL',
      stackTrace: extractStackTrace(logContent),
      recommendations: [
        '🚫 Remove the legacy MCM DLL (the original "Mod Configuration Menu" Nexus mod)',
        '✅ Install "MCM NG" — search Nexus for "MCM NG" (separate mod, NG-native)',
        '🔍 If both are installed: remove legacy MCM first, then verify MCM NG is the only MCM present',
        '⚠️ Any mod that uses MCM menus must confirm compatibility with MCM NG (most modern mods already are)',
        '📋 After swapping: test MCM by pressing Escape → Mod Config in-game',
      ],
      preventable: true,
      relatedIssues: [
        'Legacy MCM DLL not updated for NG/1.11.x',
        'MCM NG and legacy MCM installed simultaneously',
        'Mods declaring MCM dependency via FOMOD may re-install legacy MCM',
      ],
      confidence: 'high',
    };
  }

  // ── Sim Settlements 2 specific crashes ────────────────────────────────────
  if (
    log.includes('simsettlements') || log.includes('sim_settlements') ||
    log.includes('ss2') || log.includes('city plan') ||
    (log.includes('workshop') && (log.includes('script') || log.includes('npc')) && log.includes('alias'))
  ) {
    return {
      crashType: 'sim_settlements_error',
      rootCause:
        'Sim Settlements 2 (SS2) script or alias chain error. SS2 uses an extremely deep Papyrus ' +
        'script hierarchy — conflicts with other settlement/workshop mods or missing SS2 chapters ' +
        'cause script overflow, alias failures, or city plan load crashes.',
      affectedComponent: 'Sim Settlements 2 / Workshop Script System',
      stackTrace: extractStackTrace(logContent),
      recommendations: [
        '📦 Ensure all SS2 chapters are installed in correct order: SS2 Core → Chapter 1 → Chapter 2 (if used)',
        '🔄 Update SS2 to the latest version — its Nexus page (Nexus #47976) is actively maintained',
        '🚫 Do NOT mix SS2 with Conquest, See You Sleep, or other settlement-hook mods without compatibility patches',
        '⚙️ Increase Papyrus script stack: in Fallout4Custom.ini set [Papyrus] fUpdateBudgetMS=2.4 iMinMemoryPageSize=256',
        '🔍 Run CLASSIC on this log — SS2 crashes produce distinctive alias stack traces',
        '💾 Start a clean save after major SS2 updates — existing saves may have stale city plan data',
        '🛡️ Install Addictol (Nexus #84214) — BakaMaxPapyrusOps inside it helps prevent SS2 overflow',
      ],
      preventable: true,
      relatedIssues: [
        'Missing SS2 chapter files',
        'Settlement script conflicts (Conquest, SotA)',
        'Papyrus stack overflow from deep alias chains',
        'Stale city plan data in existing saves after SS2 update',
      ],
      confidence: 'high',
    };
  }

  // ── Papyrus script overflow (AddInventoryEventFilter / RegisterForUpdate) ─
  if (
    (log.includes('papyrus') || log.includes('vmstackcount') || log.includes('stack depth') ||
     log.includes('addinventoryeventfilter') || log.includes('registerforremotemotevent') ||
     log.includes('script stack')) &&
    (log.includes('overflow') || log.includes('stack') || log.includes('0xc0000005'))
  ) {
    return {
      crashType: 'papyrus_script_overflow',
      rootCause:
        'Papyrus VM script stack overflow. Most commonly caused by AddInventoryEventFilter() ' +
        'being called repeatedly without RemoveInventoryEventFilter(), or RegisterForUpdate() ' +
        'chains that fire faster than the VM can process them.',
      affectedComponent: 'Papyrus Virtual Machine',
      stackTrace: extractStackTrace(logContent),
      recommendations: [
        '🔍 Search the log for the specific script name — it will appear near "VMStackCount" or "Stack Depth"',
        '⚠️ If AddInventoryEventFilter: every call must be matched with a RemoveInventoryEventFilter on cleanup',
        '⛔ Replace RegisterForUpdate() with RegisterForSingleUpdate() and chain via OnUpdate → RegisterForSingleUpdate',
        '⚙️ Tune Papyrus budget in Fallout4Custom.ini: [Papyrus] fUpdateBudgetMS=2.4 iMinMemoryPageSize=256 iMaxMemoryPageSize=512',
        '🛡️ Install Addictol (Nexus #84214) — BakaMaxPapyrusOps extends the VM stack limit significantly',
        '📋 Use Papyrus Profiler (built into CK) to identify which scripts consume the most stack',
        '🔄 Check for circular script references: Script A calls Script B, B calls A',
      ],
      preventable: true,
      relatedIssues: [
        'AddInventoryEventFilter called without matching Remove',
        'RegisterForUpdate() in tight-loop scripts',
        'Deep alias chain in complex quest mods',
        'Papyrus budget too low for heavily-scripted mod lists',
      ],
      confidence: 'high',
    };
  }

  // ── F4SE 0.7.7 / 1.11.x Creations Menu requirement ───────────────────────
  if (
    (log.includes('f4se') || log.includes('f4seloader')) &&
    (log.includes('0.7.') || log.includes('creations') || log.includes('1.11') ||
     log.includes('plugin version') || log.includes('runtime version mismatch'))
  ) {
    return {
      crashType: 'f4se_plugin_crash',
      rootCause:
        'F4SE version mismatch for game version 1.11.x (Creations Menu, released November 2025). ' +
        'F4SE 0.7.7+ is required for 1.11.x. DLL plugins compiled for 0.6.x or earlier will crash on load.',
      affectedComponent: 'F4SE Loader / Plugin DLLs',
      stackTrace: extractStackTrace(logContent),
      recommendations: [
        '🔄 Download F4SE 0.7.7+ from f4se.silverlock.org — verify the version matches your game (1.11.x)',
        '📚 Install "Address Library for F4SE Plugins - All In One (Anniversary Edition)" build from Nexus #47327',
        '⚠️ All F4SE DLL plugins in your load order must be rebuilt for 0.7.7 — check each mod\'s Nexus page for a "1.11.x update"',
        '🔍 Look for lines in the F4SE log (Documents\\My Games\\Fallout4\\F4SE\\f4se.log) listing "loaded plugin" failures',
        '🚫 Do NOT install standalone Buffout 4 NG alongside Addictol — Addictol already includes it',
        '📋 Identify offending DLLs: every .dll in Data\\F4SE\\Plugins\\ must have a 0.7.7-compatible build',
      ],
      preventable: true,
      relatedIssues: [
        'F4SE < 0.7.7 on game version 1.11.x',
        'Address Library using wrong build (AE vs OG)',
        'DLL plugins not updated for 1.11.x runtime',
      ],
      confidence: 'high',
    };
  }

  // ── LOD / terrain data corrupt ────────────────────────────────────────────
  if (
    (log.includes('lod') || log.includes('terrain') || log.includes('dyndolod') ||
     log.includes('xlodgen') || log.includes('lgtm') || log.includes('lodgen')) &&
    (log.includes('0xc0000005') || log.includes('access violation') || log.includes('corrupt') ||
     log.includes('missing') || log.includes('failed to load'))
  ) {
    return {
      crashType: 'lod_data_corrupt',
      rootCause:
        'LOD or terrain data is stale, corrupt, or generated with an incompatible tool version. ' +
        'Occurs when DynDOLOD or xLODGen output references cells or meshes that no longer exist in the mod list.',
      affectedComponent: 'LOD / Terrain System (DynDOLOD / xLODGen)',
      stackTrace: extractStackTrace(logContent),
      recommendations: [
        '🔄 Regenerate all LOD data after any worldspace-editing mod change: run xLODGen → TexGen → DynDOLOD in that order',
        '⚠️ DynDOLOD NG requires DynDOLOD 3.x and is separate from DynDOLOD Classic — do not mix outputs',
        '🗑️ Delete your existing DynDOLOD output in your mod manager before regenerating',
        '📋 Ensure DynDOLOD is placed AFTER all worldspace mods in load order (especially PRP, UFO4P)',
        '🔍 If using SSEEdit/FO4Edit Script for LOD flags: re-run after any plugin change',
        '💾 LGTM data (Lighting LOD): rebuild via CK → File → Build Landscape LOD if you edited exterior cells',
      ],
      preventable: true,
      relatedIssues: [
        'DynDOLOD output stale after mod list change',
        'xLODGen terrain LOD referencing deleted cells',
        'LGTM not rebuilt after exterior cell edits',
        'Mixing DynDOLOD NG and Classic outputs',
      ],
      confidence: 'high',
    };
  }

  // ── Audio streaming crash (XWM / FUZ corruption) ──────────────────────────
  if (
    (log.includes('xwm') || log.includes('.fuz') || log.includes('audio') ||
     log.includes('bgsaudiomanager') || log.includes('soundmanager') || log.includes('bsa') &&
     (log.includes('voice') || log.includes('sound'))) &&
    (log.includes('0xc0000005') || log.includes('access violation') || log.includes('crash') ||
     log.includes('stream'))
  ) {
    return {
      crashType: 'audio_stream_crash',
      rootCause:
        'Audio streaming crash — caused by corrupt or malformed XWM/WAV/FUZ voice files, ' +
        'or a BA2 archive with a broken audio record header. Very common in mods with custom ' +
        'voiced dialogue that was encoded at the wrong sample rate.',
      affectedComponent: 'BGS Audio Manager / Voice System',
      stackTrace: extractStackTrace(logContent),
      recommendations: [
        '🔍 Identify the sound file: look for .fuz or .xwm filenames near the crash in the log',
        '🔄 Re-encode all XWM files at exactly 44100 Hz, 16-bit, mono (for dialogue) using xWMAEncode.exe',
        '📦 FUZ files must be correctly packed: use FUZ Packer to combine the XWM + LIP file pairs',
        '🔑 Check BA2 archive integrity: open in Bethesda Archive Extractor — corrupt audio appears as 0-byte entries',
        '⚠️ Avoid WAV files in BA2 archives without XWM conversion — the game cannot stream raw WAV from archives',
        '🛡️ Test loose files first: extract the suspected FUZ to Data\\Sound\\Voice\\ and test without the BA2',
      ],
      preventable: true,
      relatedIssues: [
        'XWM encoded at wrong sample rate or bit depth',
        'FUZ file with mismatched XWM + LIP pair',
        'Corrupt BA2 archive with 0-byte audio entries',
      ],
      confidence: 'medium',
    };
  }

  // ── Loose file / archive conflict (file shadowing) ────────────────────────
  if (
    (log.includes('loose file') || log.includes('override') || log.includes('archive conflict') ||
     (log.includes('texture') && log.includes('overwritten')) ||
     (log.includes('.dds') && log.includes('conflict')))
  ) {
    return {
      crashType: 'loose_file_conflict',
      rootCause:
        'Loose file vs BA2 archive conflict — loose files in Data\\ always override BA2 archives in Fallout 4. ' +
        'A stale loose file from a previous mod version may shadow the correct BA2 version, causing mismatched ' +
        'mesh/texture pairs and CTDs.',
      affectedComponent: 'File System / Archive Loader',
      stackTrace: extractStackTrace(logContent),
      recommendations: [
        '🗑️ Remove all loose texture/mesh files for mods that ship BA2 archives — keep only the BA2',
        '🔍 Check Data\\ directly for .dds or .nif files outside a BA2 — these override everything silently',
        '📋 In MO2: use the "Data" tab to see which files are loose vs packed — sort by extension to find .dds/.nif',
        '⚠️ Archive Invalidation must be enabled if you intentionally use loose files — add bInvalidateOlderFiles=1 to Fallout4.ini [Archive] section',
        '🔄 When updating a mod: fully remove the old version before installing the new one to clear stale loose files',
      ],
      preventable: true,
      relatedIssues: [
        'Stale loose files from old mod version',
        'Archive Invalidation not enabled',
        'MO2 virtual filesystem loose-file ordering',
      ],
      confidence: 'medium',
    };
  }

  // ── Generic access violation ───────────────────────────────────────────────
  if (log.includes('access violation') || log.includes('0xc0000005')) {
    return {
      crashType: 'access_violation',
      rootCause:
        'Memory access violation — a plugin or game module tried to read/write an invalid address.',
      affectedComponent: extractFaultingModule(logContent) || 'Unknown',
      stackTrace: extractStackTrace(logContent),
      recommendations: [
        '🔍 Identify the faulting module in the call stack (the .dll or .exe name next to the offset)',
        '📋 Run CLASSIC (Nexus #56255) on this log for automated FormID matching',
        '🔄 If the faulting module is an F4SE plugin .dll: download the correct NG or AE build',
        '🔍 Check for AWKCR, DEF_UI, or legacy MCM DLL in your load order — remove and replace them',
        '🛡️ Ensure Addictol (Nexus #84214) and Address Library AiO (Nexus #47327) are installed',
      ],
      preventable: false,
      relatedIssues: [
        'Outdated or wrong-version F4SE plugin',
        'Deprecated framework (AWKCR, DEF_UI)',
        'Missing Address Library',
      ],
      confidence: 'medium',
    };
  }

  // ── Fallback ───────────────────────────────────────────────────────────────
  return {
    crashType: 'unknown',
    rootCause:
      'Could not identify a specific crash pattern. Paste the full log content for better results.',
    affectedComponent: extractFaultingModule(logContent) || 'Unknown',
    stackTrace: extractStackTrace(logContent),
    recommendations: [
      '📋 Run CLASSIC (Nexus #56255) for automated pattern matching against 250+ known crash scenarios',
      '🔍 Look for the faulting module name in the call stack',
      '🛡️ Ensure Addictol (Nexus #84214) is installed — it produces richer crash logs',
      '🔄 Try disabling half your mods (binary search) to isolate the culprit',
    ],
    preventable: false,
    relatedIssues: [],
    confidence: 'low',
  };
}

// ─── Prevention plan generator ────────────────────────────────────────────────

/**
 * Generate a prioritised prevention plan from the result of plugin validation
 * or a crash diagnosis. Runs entirely client-side — no IPC needed.
 */
export function generatePreventionPlan(context: ModContext): PreventionPlan {
  const steps: PreventionStep[] = [];
  let riskReduction = 0;
  let priority: PreventionPlan['priority'] = 'low';

  const risk = context.crashRisk ?? 0;
  const issues = context.issues ?? [];

  // Always: verify master order
  steps.push({
    order: steps.length + 1,
    action: 'Verify Master File Order',
    description: 'Run LOOT to sort your load order and confirm all master files load before their dependents.',
    automated: true,
    tool: 'LOOT',
    command: 'loot --sort',
  });
  riskReduction += 10;

  // Missing master
  if (issues.some((i) => i.type === 'missing_master')) {
    steps.push({
      order: steps.length + 1,
      action: 'Install Missing Master Plugins',
      description: 'One or more master files required by this plugin are absent. Install them or remove the dependency.',
      automated: false,
      tool: 'Mod Manager (MO2/Vortex)',
    });
    riskReduction += 40;
    priority = 'critical';
  }

  // Deprecated framework
  if (issues.some((i) => i.type === 'deprecated_framework')) {
    steps.push({
      order: steps.length + 1,
      action: 'Remove Deprecated Frameworks',
      description: 'AWKCR, Armorsmith Extended, DEF_UI, or legacy MCM DLL detected. Remove and replace with modern equivalents (ECO/NEO, FallUI Suite, MCM NG).',
      automated: false,
      tool: 'xEdit + Mod Manager',
    });
    riskReduction += 45;
    priority = 'critical';
  }

  // ESL FormID overflow
  if (issues.some((i) => i.type === 'esl_formid_overflow')) {
    steps.push({
      order: steps.length + 1,
      action: 'Compact FormIDs for ESL',
      description: 'ESL local FormIDs exceed 0xFFF. Run xEdit → Compact FormIDs for ESL before flagging.',
      automated: true,
      tool: 'xEdit',
      command: 'Right-click plugin → Compact FormIDs for ESL',
    });
    riskReduction += 35;
    priority = priority === 'critical' ? 'critical' : 'high';
  }

  // Navmesh
  if (context.hasNavmesh) {
    steps.push({
      order: steps.length + 1,
      action: 'Back Up Before Navmesh Edits',
      description: 'Create a plugin backup before any navmesh session. Use the navmesh Cut tool, not direct triangle deletion.',
      automated: false,
      tool: 'File Explorer / CK',
    });
    riskReduction += 15;
    if (priority === 'low') priority = 'medium';
  }

  // Precombines
  if (context.hasPrecombines) {
    steps.push({
      order: steps.length + 1,
      action: 'Regenerate Precombines After Cell Edits',
      description: 'After editing exterior cells, regenerate precombine geometry (CK: File → Generate Precombined Geometry) to avoid FPS drops and previs CTDs.',
      automated: true,
      tool: 'Creation Kit',
      command: 'File → Generate Precombined Geometry → Select cells',
    });
    riskReduction += 20;
    if (priority === 'low') priority = 'medium';
  }

  // Large file / memory risk
  if (context.fileSize && context.fileSize > 30 * 1024 * 1024) {
    steps.push({
      order: steps.length + 1,
      action: 'Memory Management During CK Sessions',
      description: 'Plugin is large — save every 10 minutes, restart CK every 30–45 minutes, and close other applications.',
      automated: false,
      tool: 'Task Manager',
    });
    riskReduction += 10;
  }

  // High crash risk from previous analysis
  if (risk > 60) {
    steps.push({
      order: steps.length + 1,
      action: 'Clean Plugin with xEdit',
      description: 'Run xEdit Quick Auto Clean to remove Identical-to-Master records and restore deleted references (UDRs).',
      automated: true,
      tool: 'xEdit',
      command: 'FO4Edit.exe -quickautoclean -autoload "plugin.esp"',
    });
    riskReduction += 15;
    priority = priority === 'low' ? 'high' : priority;
  }

  // Repeat crash patterns
  if (context.previousCrashTypes && context.previousCrashTypes.length > 0) {
    const most = mostCommon(context.previousCrashTypes);
    steps.push({
      order: steps.length + 1,
      action: `Address Recurring ${labelCrashType(most)} Pattern`,
      description: `This crash type has appeared before. Apply targeted mitigation: ${crashTypeMitigation(most)}`,
      automated: false,
    });
    riskReduction += 15;
    priority = 'critical';
  }

  // Always: install Addictol
  steps.push({
    order: steps.length + 1,
    action: 'Confirm Addictol is Installed',
    description: 'Addictol (Nexus #84214) is the all-in-one stability stack for OG/NG/1.11.x. Includes Buffout 4, X-Cell, Faster Workshop. Do NOT install standalone Buffout 4 alongside it.',
    automated: false,
    tool: 'Mod Manager',
  });
  riskReduction += 5;

  const minutes = steps.length * 2;
  const estimatedTime =
    minutes < 60 ? `${minutes} minutes` : `${Math.ceil(minutes / 60)} hour${minutes >= 120 ? 's' : ''}`;

  return {
    steps,
    estimatedRiskReduction: Math.min(riskReduction, 90),
    estimatedTime,
    priority,
  };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function extractStackTrace(logContent: string): string[] | undefined {
  const lines = logContent.split('\n');
  const stack: string[] = [];
  let inStack = false;

  for (const line of lines) {
    const l = line.toLowerCase();
    if (l.includes('call stack') || l.includes('stack trace') || l.includes('[0]')) {
      inStack = true;
    }
    if (inStack) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('---') || (stack.length > 0 && !trimmed.match(/^\[?\d+\]?|0x[0-9a-f]+/i))) break;
      if (trimmed) stack.push(trimmed);
      if (stack.length >= 15) break;
    }
  }

  return stack.length > 0 ? stack : undefined;
}

function extractFaultingModule(logContent: string): string | undefined {
  const match = logContent.match(/EXCEPTION_ACCESS_VIOLATION[^\n]*\n[^\n]*?([A-Za-z0-9_]+\.(?:exe|dll))/i);
  if (match) return match[1];
  const dllMatch = logContent.match(/\[0\][^\n]*?([A-Za-z0-9_\-]+\.(?:exe|dll))/i);
  return dllMatch ? dllMatch[1] : undefined;
}

function mostCommon<T>(arr: T[]): T {
  const counts = new Map<T, number>();
  arr.forEach((v) => counts.set(v, (counts.get(v) ?? 0) + 1));
  let best = arr[0];
  let max = 0;
  counts.forEach((c, v) => { if (c > max) { max = c; best = v; } });
  return best;
}

function labelCrashType(t: CrashType): string {
  const labels: Record<CrashType, string> = {
    memory_overflow: 'Memory Overflow',
    access_violation: 'Access Violation',
    navmesh_conflict: 'Navmesh Conflict',
    precombine_corrupt: 'Precombine Corruption',
    stack_overflow: 'Stack Overflow',
    missing_asset: 'Missing Asset',
    script_error: 'Script Error',
    version_mismatch: 'Version Mismatch',
    deprecated_framework: 'Deprecated Framework',
    ba2_header_mismatch: 'BA2 Header Mismatch',
    mcm_conflict: 'MCM Framework Conflict',
    sim_settlements_error: 'Sim Settlements 2 Error',
    papyrus_script_overflow: 'Papyrus Script Overflow',
    loose_file_conflict: 'Loose File / Archive Conflict',
    lod_data_corrupt: 'LOD / Terrain Data Corrupt',
    f4se_plugin_crash: 'F4SE Plugin Crash (1.11.x)',
    audio_stream_crash: 'Audio Streaming Crash',
    unknown: 'Unknown',
  };
  return labels[t] ?? t;
}

function crashTypeMitigation(t: CrashType): string {
  const m: Partial<Record<CrashType, string>> = {
    memory_overflow: 'Save more frequently, restart CK every 30 min, install CKPE memory patches',
    access_violation: 'Identify faulting DLL in call stack, update to NG/AE build, check Address Library version',
    navmesh_conflict: 'Save before navmesh edits, use Cut tool not Delete, run xEdit UDR check',
    precombine_corrupt: 'Install PRP v81.5+, regenerate precombines after cell edits',
    stack_overflow: 'Replace RegisterForUpdate with event-driven handlers, check for circular script calls',
    missing_asset: 'Verify all mod dependencies installed, check BA2 header version (V1 vs V2)',
    deprecated_framework: 'Remove AWKCR/DEF_UI/legacy MCM, replace with ECO/NEO/FallUI/MCM NG',
    version_mismatch: 'Install matching F4SE + Address Library AiO build for your game version',
    ba2_header_mismatch: 'Repack BA2 with Archive2 using explicit version flag matching your game version',
    mcm_conflict: 'Remove legacy MCM DLL, install MCM NG (separate Nexus mod)',
    sim_settlements_error: 'Update SS2 to latest, ensure all chapters installed, increase Papyrus budget in INI',
    papyrus_script_overflow: 'Balance AddInventoryEventFilter calls, replace RegisterForUpdate loops, install BakaMaxPapyrusOps via Addictol',
    loose_file_conflict: 'Remove stale loose .dds/.nif files that override BA2, enable Archive Invalidation',
    lod_data_corrupt: 'Regenerate LOD: xLODGen â TexGen â DynDOLOD; delete old output first',
    f4se_plugin_crash: 'Install F4SE 0.7.7+ and Address Library AE build; update all F4SE DLL plugins for 1.11.x',
    audio_stream_crash: 'Re-encode audio at 44100 Hz, repack FUZ files correctly, check BA2 audio entries for 0-byte corruption',
  };
  return m[t] ?? 'Review crash log with CLASSIC for specific guidance';
}
