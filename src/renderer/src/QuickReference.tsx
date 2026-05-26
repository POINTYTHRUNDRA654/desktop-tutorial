import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Book, Code, Keyboard, Hash, ChevronDown, ChevronUp, Zap, FileCode, Terminal, Palette, Copy, Check } from 'lucide-react';
import { ToolsInstallVerifyPanel } from './components/ToolsInstallVerifyPanel';

interface ReferenceSection {
  id: string;
  title: string;
  icon: React.ElementType;
  items: ReferenceItem[];
}

interface ReferenceItem {
  name: string;
  description: string;
  example?: string;
  category?: string;
}

type QuickReferenceProps = {
  embedded?: boolean;
};

export const QuickReference: React.FC<QuickReferenceProps> = ({ embedded = false }) => {
  const [expandedSections, setExpandedSections] = useState<string[]>(['papyrus']);
  const [searchQuery, setSearchQuery] = useState('');
  const [openedItemId, setOpenedItemId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 1500);
    }).catch(() => {
      // fallback for restricted environments
      const el = document.createElement('textarea');
      el.value = text;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 1500);
    });
  };

  const toggleSection = (sectionId: string) => {
    setExpandedSections(prev =>
      prev.includes(sectionId)
        ? prev.filter(id => id !== sectionId)
        : [...prev, sectionId]
    );
  };

  const toggleItemInfo = (itemId: string) => {
    setOpenedItemId((prev) => (prev === itemId ? null : itemId));
  };

  const references: ReferenceSection[] = [
    {
      id: 'papyrus',
      title: 'Papyrus Keywords',
      icon: Code,
      items: [
        { name: 'Event', description: 'Defines an event handler', example: 'Event OnInit()', category: 'Core' },
        { name: 'Function', description: 'Defines a function', example: 'Function MyFunc()', category: 'Core' },
        { name: 'Property', description: 'Defines a property variable', example: 'Int Property MyCount Auto', category: 'Core' },
        { name: 'Auto', description: 'Auto property (no getter/setter)', example: 'Actor Property Player Auto', category: 'Modifier' },
        { name: 'AutoReadOnly', description: 'Read-only auto property', example: 'Int Property Version AutoReadOnly', category: 'Modifier' },
        { name: 'Conditional', description: 'Property conditional', example: 'Bool Property IsEnabled = True Auto Conditional', category: 'Modifier' },
        { name: 'Extends', description: 'Inherits from parent script', example: 'ScriptName MyScript extends Quest', category: 'Core' },
        { name: 'If/ElseIf/Else', description: 'Conditional logic', example: 'If health < 50\\n    ; code\\nEndIf', category: 'Control' },
        { name: 'While/EndWhile', description: 'Loop construct', example: 'While i < 10\\n    i += 1\\nEndWhile', category: 'Control' },
        { name: 'Return', description: 'Exit function/return value', example: 'Return true', category: 'Control' },
        { name: 'New', description: 'Create array', example: 'Int[] MyArray = new Int[5]', category: 'Array' },
        { name: 'As', description: 'Type cast', example: 'Actor npc = akRef as Actor', category: 'Cast' },
        { name: 'Self', description: 'Reference to this script', example: 'Self.Stop() ; preferred — Self.RegisterForUpdate is an anti-pattern', category: 'Reference' },
        {
          name: '⛔ RegisterForUpdate() — ANTI-PATTERN',
          description: 'NEVER use RegisterForUpdate() for logic checks — it polls every tick and causes script lag. Replace with RegisterForRemoteEvent, RegisterForAnimationEvent, or RegisterForExternalEvent (MCM). Instant fail on Mossy\'s rubric.',
          example: '; BAD: RegisterForUpdate(1.0)  GOOD: RegisterForRemoteEvent(akActor,"OnItemAdded")',
          category: 'Anti-Pattern ❌',
        },
        {
          name: 'Game.IsPluginInstalled()',
          description: 'AE/1.11.x detection gate. Always check before referencing AE forms: Game.IsPluginInstalled("Fallout4 - Creations.esm")',
          example: 'if (Game.IsPluginInstalled("Fallout4 - Creations.esm"))',
          category: 'Compatibility',
        },
        { name: 'Import', description: 'Import external script', example: 'Import F4SE', category: 'Core' },
        { name: 'Global', description: 'Mark as global function', example: 'Function GlobalFunc() Global', category: 'Modifier' },
        { name: 'Native', description: 'Engine-defined function', example: 'Function NativeFunc() Native', category: 'Modifier' },
      ]
    },
    {
      id: 'f4se',
      title: 'F4SE Functions',
      icon: Zap,
      items: [
        { name: 'F4SE.GetVersion()', description: 'Returns F4SE version', example: 'Int version = F4SE.GetVersion()', category: 'Info' },
        { name: 'F4SE.GetVersionMinor()', description: 'Returns F4SE minor version', category: 'Info' },
        { name: 'F4SE.GetVersionBeta()', description: 'Returns F4SE beta version', category: 'Info' },
        { name: 'UI.OpenMenu()', description: 'Opens game menu', example: 'UI.OpenMenu("PipBoyMenu")', category: 'UI' },
        { name: 'UI.CloseMenu()', description: 'Closes game menu', example: 'UI.CloseMenu("PipBoyMenu")', category: 'UI' },
        { name: 'UI.IsMenuOpen()', description: 'Check if menu is open', example: 'Bool open = UI.IsMenuOpen("PipBoyMenu")', category: 'UI' },
        { name: 'Input.TapKey()', description: 'Simulates key press', example: 'Input.TapKey(57) ; Space', category: 'Input' },
        { name: 'Math.DegreesToRadians()', description: 'Convert degrees to radians', category: 'Math' },
        { name: 'Math.RadiansToDegrees()', description: 'Convert radians to degrees', category: 'Math' },
        { name: 'ObjectReference.AttachModToInventoryItem()', description: 'Attach mod to item', category: 'Item' },
        { name: 'ObjectReference.GetInventoryWeight()', description: 'Get total inventory weight', category: 'Inventory' },
        { name: 'Actor.GetEquippedItemType()', description: 'Get equipped item type', example: 'Int type = Player.GetEquippedItemType(0)', category: 'Actor' },
        { name: 'Actor.IsInPowerArmor()', description: 'Check if in power armor', category: 'Actor' },
        { name: 'Weapon.GetAmmoCapacity()', description: 'Get weapon ammo capacity', category: 'Weapon' },
        { name: 'InstanceData', description: 'F4SE instance data for items', example: 'InstanceData:Owner owner', category: 'Advanced' },
      ]
    },
    {
      id: 'ck-hotkeys',
      title: 'Creation Kit Hotkeys',
      icon: Keyboard,
      items: [
        { name: 'Ctrl + D', description: 'Duplicate selected object', category: 'Object' },
        { name: 'Ctrl + F', description: 'Find/Search', category: 'Navigation' },
        { name: 'F', description: 'Focus on selected object', category: 'Camera' },
        { name: 'C', description: 'Center on cell', category: 'Camera' },
        { name: 'T', description: 'Top view', category: 'Camera' },
        { name: 'Ctrl + Q', description: 'Toggle markers', category: 'View' },
        { name: 'M', description: 'Toggle move gizmo', category: 'Transform' },
        { name: 'R', description: 'Toggle rotate gizmo', category: 'Transform' },
        { name: 'S', description: 'Toggle scale gizmo', category: 'Transform' },
        { name: 'Z', description: 'Local/World space toggle', category: 'Transform' },
        { name: 'Q', description: 'Selection tool', category: 'Tool' },
        { name: 'B', description: 'Break prefab instance', category: 'Object' },
        { name: 'Ctrl + Alt + D', description: 'Duplicate in place', category: 'Object' },
        { name: 'Delete', description: 'Delete selected (mark as deleted)', category: 'Object' },
        { name: 'H', description: 'Snap to ground', category: 'Transform' },
        { name: 'Ctrl + S', description: 'Save plugin', category: 'File' },
        { name: 'Ctrl + N', description: 'New form', category: 'Edit' },
        { name: 'Ctrl + E', description: 'Edit current cell', category: 'Cell' },
      ]
    },
    {
      id: 'mossy-standards',
      title: 'Mossy\'s FO4 Standards',
      icon: Palette,
      items: [
        { name: 'Animation Rate', description: 'ALWAYS use 30 FPS for Fallout 4 animations.', example: '30 FPS', category: 'Animation' },
        { name: 'Metric Scale', description: 'Use 1.0 Scale (1 unit = 1 meter) in Blender.', example: '1.0 Scale', category: 'Modeling' },
        { name: 'Previs/Precombines', description: 'Never disable precombines. Rebuild them if you edit cells.', category: 'Optimization' },
        { name: 'Project Isolation', description: 'Keep each mod in its own folder in The Hive.', category: 'Workflow' },
        { name: 'ESPFE / ESL', description: 'Use ESL-flagged ESPs for small mods to save plugin slots.', category: 'Core' },
      ]
    },
    {
      id: 'modern-fo4-baseline',
      title: 'Modern FO4 Baseline (2025+)',
      icon: Zap,
      items: [
        {
          name: 'Match your runtime branch',
          description: 'Keep game version, F4SE build, and plugin stack on the same Fallout 4 branch (legacy vs next-gen).',
          example: 'Validate runtime + F4SE + plugin compatibility before adding mods.',
          category: 'Core',
        },
        {
          name: 'Address Library + script extender compatibility',
          description: 'Treat Address Library/F4SE compatibility as a hard requirement for native plugin-based fixes and frameworks.',
          category: 'Core',
        },
        {
          name: 'Engine stability first',
          description: 'Install crash logging and engine-fix foundations (Addictol #84214 all-in-one stack) before heavy content packs, then test in small batches.',
          category: 'Stability',
        },
        {
          name: 'High-FPS safety',
          description: 'Use a high-FPS/physics fix configuration when targeting uncapped frame rates to avoid simulation breakage.',
          category: 'Stability',
        },
        {
          name: 'Previs/precombine discipline',
          description: 'Use PRP-aware workflows and never ship worldspace edits that break precombines/previs without proper rebuilds/patches.',
          category: 'Optimization',
        },
        {
          name: 'Modern graphics stack sequencing',
          description: 'Layer graphics upgrades deliberately: texture/material pipeline, lighting/weather stack, then optional upscalers/post-processing.',
          example: 'Validate baseline visuals first, then add ENB/Community Shaders/upscaler stack incrementally.',
          category: 'Graphics',
        },
        {
          name: 'BA2 Header V1 vs V2',
          description: 'Pre-NG (1.10.163) uses BA2 Header V1. Next-Gen and Anniversary Edition (1.10.980+) require V2. Packing with wrong header = invisible textures or CTD.',
          example: 'Use Archive2 v2+ or CAO configured for BA2 V2 on NG/AE builds.',
          category: 'Compatibility',
        },
        {
          name: 'REL::ID for C++ plugins',
          description: 'NEVER hardcode BaseAddress + offset in F4SE plugins — it breaks every game update. Use REL::Relocation<uintptr_t>(REL::ID(58319)).address() via CommonAddressLibrary.',
          example: 'REL::Relocation<uintptr_t> fn(REL::ID(58319)); fn.address();',
          category: 'C++ Plugin',
        },
      ],
    },
    {
      id: 'deprecated-frameworks',
      title: '🚫 Deprecated Frameworks (NG/AE)',
      icon: Zap,
      items: [
        {
          name: 'AWKCR — ❌ CRITICAL DEPRECATION',
          description: 'Armor and Weapon Keywords Community Resource. Causes save bloat, workbench menu lag, and instant CTD at armor/weapons workbench on NG/AE. DO NOT USE.',
          example: 'Replace with: ECO (Equipment & Crafting Overhaul) or NEO (New Equipment Overhaul)',
          category: 'Deprecated',
        },
        {
          name: 'Armorsmith Extended — ❌ DEPRECATED',
          description: 'Relies entirely on AWKCR. Hard-overwrites vanilla armor slots, breaking modern body meshes. Abandoned framework.',
          example: 'Replace with: LEO (Legendary Effect Overhaul) + RobCo Scripter configurations',
          category: 'Deprecated',
        },
        {
          name: 'DEF_UI / DEF_HUD — ❌ ENGINE INCOMPATIBLE',
          description: 'Hardcoded 2015 Flash .swf files. NG/AE changed the Creations store UI — these files cause instant CTD on pause menu or map open.',
          example: 'Replace with: FallUI Suite (FallUI - HUD, FallUI - Inventory)',
          category: 'Deprecated',
        },
        {
          name: 'Buffout 4 / X-Cell / BakaMaxPapyrusOps — ⚠️ SUPERSEDED',
          description: 'All standalone variants of Buffout 4 (OG, NG, AE), X-Cell, and BakaMaxPapyrusOps are superseded by Addictol (Nexus #84214), which bundles all their fixes plus more. Do NOT install them alongside Addictol.',
          example: 'Install Addictol (Nexus #84214) as your single all-in-one stability solution.',
          category: 'Superseded',
        },
        {
          name: 'Legacy MCM Framework — ❌ NG/1.11.x INCOMPATIBLE',
          description: 'The original MCM Framework does not work on Next-Gen or 1.11.x runtimes. Use MCM NG (search Nexus for "MCM NG").',
          example: 'Replace with: MCM NG (Nexus search)',
          category: 'Deprecated',
        },
      ],
    },
    {
      id: 'stability-stack-2025',
      title: '🛡️ 2025–2026 Stability Stack',
      icon: Zap,
      items: [
        { name: 'F4SE (match runtime)', description: 'Script Extender — must match your game runtime exactly. v0.7.7 for runtime 1.11.191. Download from f4se.silverlock.org.', example: 'f4se.silverlock.org — match version to your Fallout4.exe build', category: 'Foundation' },
        { name: 'Address Library (AiO)', description: 'Nexus #47327 — All-In-One Anniversary Edition build. Required by all DLL/native plugins. Install before any plugin that needs it.', example: 'Nexus #47327 — Address Library for F4SE Plugins (AiO)', category: 'Foundation' },
        { name: 'Addictol (ALL-IN-ONE)', description: 'Nexus #84214 — Supersedes Buffout 4, X-Cell, BakaMaxPapyrusOps, Faster Workshop, and 10+ other stability mods. Install only Addictol — do NOT add those others.', example: 'Nexus #84214 — do NOT install Buffout 4 or X-Cell alongside', category: 'Stability ⭐' },
        { name: 'High FPS Physics Fix', description: 'Nexus #44798, v0.8.13+. Critical if playing above 60 FPS. Prevents physics explosion/teleportation bugs at high framerates.', example: 'Nexus #44798 — required for 60+ FPS gameplay', category: 'Stability' },
        { name: 'UFO4P (Unofficial Patch)', description: 'Always use the latest version. Load after all official DLC masters. Core requirement for most load orders.', example: 'Load: after DLCNukaWorld.esm, before other mods', category: 'Core' },
        { name: 'PRP 81.5+', description: 'Nexus #46403 — PreVis Repair Pack. March 2026 stable build. Required for NG/1.11.x content cells. Load late in order, compatibility patches last.', example: 'Nexus #46403 — load late; PRP patches load after', category: 'Optimization' },
        { name: 'MCM NG', description: 'Next-Gen build of the Mod Configuration Menu. The legacy MCM Framework does not work on NG/1.11.x. Search Nexus for "MCM NG".', example: 'Nexus search: MCM NG', category: 'Framework' },
        { name: 'CLASSIC Crash Scanner', description: 'Nexus #56255 — run after every CTD. Reads Addictol crash logs at %LOCALAPPDATA%\\Fallout4\\F4SE\\. Covers 250+ error scenarios.', example: 'Nexus #56255 — run after any CTD before troubleshooting further', category: 'Diagnostics' },
        { name: 'Canary Save Scummer', description: 'Save file health checker — warns of corruption before it becomes a full loss. Run regularly on long playthroughs.', example: 'Nexus search: Canary Save Scummer', category: 'Diagnostics' },
        { name: 'The Midnight Ride guide', description: 'Authoritative NG/1.11.x modding setup guide. Kept updated after every patch. Start here if setting up a new load order.', example: 'themidnightride.moddinglinked.com', category: 'Guide' },
      ],
    },
    {
      id: 'common-errors',
      title: '🔥 Common Errors & Solutions',
      icon: Terminal,
      items: [
        { name: 'Stack Overflow (Papyrus)', description: 'Cause: Infinite loop or too-deep recursion. Add Utility.Wait(0.1) in all while-loops. Check for recursive function chains. Reduce update frequency.', example: 'While i < 10\n    i += 1\n    Utility.Wait(0.1) ; REQUIRED\nEndWhile', category: 'Papyrus' },
        { name: 'Cannot call X() on a None object', description: 'Cause: Script property not filled in CK, or object was deleted. Fix: verify all properties are filled; add None-guard before every call.', example: 'if MyProperty != None\n    MyProperty.DoSomething()\nEndIf', category: 'Papyrus' },
        { name: 'Yellow Precombined Meshes', description: 'Cause: Cell edits broke PreVis/Precombines. Fix: Regenerate PreVis in CK, or disable PreVis for that cell only (performance hit). Use PRP for common areas.', example: 'CK → World → Precombine/Previs menu → Generate Cell', category: 'Previs' },
        { name: 'CTD on Cell Load', description: 'Cause: Corrupt mesh, bad NavMesh, deleted NAVM record, or missing texture. Step 1: Run CLASSIC (Nexus #56255) on Addictol crash log. Step 2: Check Papyrus log. Step 3: scan ESP for [D] NAVM in xEdit.', example: 'Logs at: %LOCALAPPDATA%\\Fallout4\\F4SE\\', category: 'CTD' },
        { name: 'ESP won\'t load in CK', description: 'Cause: Missing master, corrupted ESP, or CK/game version mismatch. Fix: load all masters in CK arguments, verify ESP with xEdit, check CK version matches game.', example: 'CK launch args: -LoadMasterFilesFirst', category: 'CK' },
        { name: 'Script Won\'t Compile', description: 'Cause: Syntax error, missing parent script, incorrect property type, or wrong import path. Check Papyrus log for exact error line.', example: 'Check: Papyrus Compiler log in CK output window', category: 'Papyrus' },
        { name: 'Invisible textures / BA2 mismatch', description: 'Pre-NG (1.10.163) uses BA2 Header V1. NG/AE (1.10.980+) requires V2. Using the wrong header produces invisible or pink textures and can CTD.', example: 'Pack with Archive2 v2+ or CAO set to BA2 V2 on NG/AE', category: 'Assets' },
        { name: 'NPC frozen near door / CTD on fast-travel', description: 'Classic symptom of a deleted NAVM record. Never delete vanilla NavMesh — always use the Change FormID method in xEdit to replace it.', example: 'xEdit: find [D] NAVM records → Change FormID → replace', category: 'NavMesh' },
        { name: 'Workbench CTD (armor/weapons)', description: 'Classic AWKCR conflict. Remove AWKCR from your load order. Replace with ECO (Equipment & Crafting Overhaul) or NEO.', example: 'Replace AWKCR with: ECO or NEO (Nexus search)', category: 'Load Order' },
      ],
    },
    {
      id: 'nif-specs',
      title: '🔷 NIF / Mesh Specifications',
      icon: FileCode,
      items: [
        { name: 'BSTriShape', description: 'FO4 main mesh geometry block. Always use BSTriShape, never old NiTriShape. Version: 20.2.0.7.', category: 'Block Type' },
        { name: 'BSLightingShaderProperty', description: 'Material and texture assignment block. Defines shader type (default, skin, glow, etc).', category: 'Block Type' },
        { name: 'BSShaderTextureSet', description: 'Texture file paths — must be relative to the Data folder (e.g. textures\\mymod\\mesh_d.dds).', category: 'Block Type' },
        { name: 'bhkCollisionObject', description: 'Collision data container. Required for all physics objects.', category: 'Block Type' },
        { name: 'Slot 0 — Diffuse', description: 'File suffix: _d.dds. Format: BC1 (opaque) or BC7 (alpha). Base color texture.', example: 'textures\\mymod\\object_d.dds', category: 'Texture Slot' },
        { name: 'Slot 1 — Normal', description: 'File suffix: _n.dds. Format: BC5 (2-channel). Critical for lighting — never skip.', example: 'textures\\mymod\\object_n.dds', category: 'Texture Slot' },
        { name: 'Slot 2 — Glow/Emissive', description: 'File suffix: _g.dds. Controls self-illumination. Black = no glow.', example: 'textures\\mymod\\object_g.dds', category: 'Texture Slot' },
        { name: 'Slot 4 — Environment Mask', description: 'File suffix: _e.dds. Controls reflectivity/specularity per-pixel for environment maps.', example: 'textures\\mymod\\object_e.dds', category: 'Texture Slot' },
        { name: 'Slot 7 — Specular', description: 'File suffix: _s.dds. Format: BC1. Grayscale shininess map.', example: 'textures\\mymod\\object_s.dds', category: 'Texture Slot' },
        { name: 'Triangle budget — Weapons', description: 'Keep under 5,000 triangles for weapon meshes. Use LODs for distant views.', example: '< 5,000 tris (weapon) / < 10,000 tris (armor piece)', category: 'Optimization' },
        { name: 'Texture max sizes', description: 'Weapons/Armor: 2048×2048 (hero: 4096). Environment props: 1024×1024. UI: 512×512. Always use power-of-2 dimensions.', category: 'Optimization' },
        { name: 'NifSkope cleanup checklist', description: 'After export: verify BSTriShape block type → link BGSM/BGEM materials → Sanitize → Reorder Blocks → Sanitize → Update Tangents/Space → check bhkCollisionObject.', category: 'Workflow' },
      ],
    },
    {
      id: 'navmesh-repair',
      title: '🗺️ NavMesh Repair',
      icon: FileCode,
      items: [
        { name: 'NEVER delete vanilla NAVM', description: 'Deleted NAVM records (flag 0x00000020) cause instant CTD when NPCs pathfind through the area. Always replace using xEdit Change FormID — never delete.', category: 'Rule #1 ⛔' },
        { name: 'xEdit replacement workflow', description: '1) Load plugin + all masters in xEdit 4.0.3+. 2) Find [D] NAVM records (or run Check for Errors). 3) Copy FormID of deleted NAVM. 4) Right-click replacement → Change FormID → paste FormID → accept "Update all references". 5) Remove old [D] record. 6) Run Check for Errors → Save.', category: 'xEdit' },
        { name: 'CK NavMesh rules', description: 'Never click Delete on a navmesh triangle. Cover the area with a new triangle first, THEN remove the old one. Always Finalize Cell Navmesh before saving. Use Navmesh → Find Navmesh Errors.', category: 'CK' },
        { name: 'CTD symptoms', description: 'NPCs frozen near doors • CTD on fast-travel to settlement • NPCs refusing to enter/exit buildings • Crash on cell load in a modded area.', category: 'Symptoms' },
        { name: 'Real Jenn — NavMesh fix video', description: 'YouTube: "Fixing and Preventing Deleted Navmeshes" by Real Jenn. The definitive visual walkthrough for the Change FormID method.', example: 'youtube.com/watch?v=yRBsmki8JHA', category: 'Resource' },
        { name: 'AFKMods NavMesh guide', description: 'afkmods.com → Knowledge Base → Navmesh Repair. Written reference covering edge cases and cell border issues.', category: 'Resource' },
      ],
    },
    {
      id: 'formids',
      title: 'FormID Ranges',
      icon: Hash,
      items: [
        { name: '00000000-00FFFFFF', description: 'Fallout4.esm (base game)', category: 'Base' },
        { name: '01000000-01FFFFFF', description: 'DLC01: Automatron', category: 'DLC' },
        { name: '02000000-02FFFFFF', description: 'DLC02: Wasteland Workshop', category: 'DLC' },
        { name: '03000000-03FFFFFF', description: 'DLC03: Far Harbor', category: 'DLC' },
        { name: '04000000-04FFFFFF', description: 'DLC04: Contraptions', category: 'DLC' },
        { name: '05000000-05FFFFFF', description: 'DLC05: Vault-Tec', category: 'DLC' },
        { name: '06000000-06FFFFFF', description: 'DLC06: Nuka-World', category: 'DLC' },
        { name: 'FE000000-FE000FFF', description: 'ESL light plugins (index 000-FFF) — max 4096 local FormIDs per ESL (0x000–0xFFF). Exceeding 0xFFF causes save corruption. Use xEdit "Compact FormIDs for ESL" to fix.', category: 'Light' },
        { name: 'FF000000-FFFFFFFF', description: 'Dynamic forms (runtime)', category: 'Runtime' },
        { name: '00000014', description: 'PlayerREF (player character)', category: 'Special' },
        { name: '00000007', description: 'Player base actor', category: 'Special' },
      ]
    },
    {
      id: 'xedit',
      title: 'xEdit/FO4Edit Shortcuts',
      icon: FileCode,
      items: [
        { name: 'Ctrl + Click', description: 'Add to selection', category: 'Selection' },
        { name: 'Shift + Click', description: 'Select range', category: 'Selection' },
        { name: 'Ctrl + F', description: 'Find', category: 'Search' },
        { name: 'Ctrl + S', description: 'Save', category: 'File' },
        { name: 'Alt + X', description: 'Exit', category: 'File' },
        { name: 'Ctrl + A', description: 'Apply filter', category: 'Filter' },
        { name: 'Right-click > Apply Script', description: 'Run automation script', category: 'Script' },
        { name: 'Right-click > Compare To', description: 'Compare records', category: 'Compare' },
        { name: 'Right-click > Copy As Override', description: 'Create override', category: 'Edit' },
        { name: 'Right-click > Remove', description: 'Remove record (mark as deleted)', category: 'Edit' },
        { name: 'Right-click > VWD', description: 'Generate Visible When Distant', category: 'LOD' },
        { name: 'F2', description: 'Rename/Edit', category: 'Edit' },
        { name: 'Delete', description: 'Delete record', category: 'Edit' },
      ]
    },
    {
      id: 'blender',
      title: 'Blender Python (bpy) Basics',
      icon: Palette,
      items: [
        { name: 'bpy.context', description: 'Current context (active object, etc.)', example: 'obj = bpy.context.active_object', category: 'Context' },
        { name: 'bpy.data', description: 'Access all data (meshes, materials, etc.)', example: 'mesh = bpy.data.meshes["Cube"]', category: 'Data' },
        { name: 'bpy.ops', description: 'Operators (actions)', example: 'bpy.ops.mesh.primitive_cube_add()', category: 'Operations' },
        { name: 'bpy.context.selected_objects', description: 'List of selected objects', example: 'for obj in bpy.context.selected_objects:', category: 'Selection' },
        { name: 'bpy.context.active_object', description: 'Currently active object', example: 'obj = bpy.context.active_object', category: 'Selection' },
        { name: 'bpy.ops.object.select_all()', description: 'Select all objects', example: 'bpy.ops.object.select_all(action="SELECT")', category: 'Selection' },
        { name: 'bpy.ops.export_scene.fbx()', description: 'Export FBX', example: 'bpy.ops.export_scene.fbx(filepath="output.fbx")', category: 'Export' },
        { name: 'bpy.ops.import_scene.fbx()', description: 'Import FBX', example: 'bpy.ops.import_scene.fbx(filepath="input.fbx")', category: 'Import' },
        { name: 'obj.location', description: 'Object position (x,y,z)', example: 'obj.location = (0, 0, 1)', category: 'Transform' },
        { name: 'obj.rotation_euler', description: 'Object rotation (euler)', example: 'obj.rotation_euler = (0, 0, 1.57)', category: 'Transform' },
        { name: 'obj.scale', description: 'Object scale', example: 'obj.scale = (2, 2, 2)', category: 'Transform' },
        { name: 'obj.data', description: 'Object data (mesh, etc.)', example: 'mesh = obj.data', category: 'Data' },
        { name: 'bpy.ops.object.modifier_add()', description: 'Add modifier', example: 'bpy.ops.object.modifier_add(type="SUBSURF")', category: 'Modifier' },
        { name: 'obj.modifiers', description: 'List of modifiers', example: 'for mod in obj.modifiers:', category: 'Modifier' },
      ]
    },
    {
      id: 'console',
      title: 'Console Commands',
      icon: Terminal,
      items: [
        { name: 'coc <cellID>', description: 'Center on cell (teleport)', example: 'coc RedRocketExt', category: 'Navigation' },
        { name: 'player.additem <formID> <count>', description: 'Add item to player', example: 'player.additem 0001f66a 100', category: 'Item' },
        { name: 'player.setav <attr> <value>', description: 'Set attribute value', example: 'player.setav health 1000', category: 'Stats' },
        { name: 'player.moveto <refID>', description: 'Move player to reference', example: 'player.moveto 00019d09', category: 'Navigation' },
        { name: 'setstage <questID> <stage>', description: 'Set quest stage', example: 'setstage MQ102 200', category: 'Quest' },
        { name: 'completequest <questID>', description: 'Complete quest', example: 'completequest MQ102', category: 'Quest' },
        { name: 'resetquest <questID>', description: 'Reset quest', example: 'resetquest MQ102', category: 'Quest' },
        { name: 'help "<search>" 4', description: 'Search for item', example: 'help \"power armor\" 4', category: 'Search' },
        { name: 'tmm 1', description: 'Toggle map markers (show all)', category: 'Map' },
        { name: 'tgm', description: 'Toggle god mode', category: 'Cheat' },
        { name: 'tcl', description: 'Toggle collision', category: 'Cheat' },
        { name: 'tfc', description: 'Toggle free camera', category: 'Camera' },
        { name: 'tm', description: 'Toggle menus (screenshot mode)', category: 'UI' },
        { name: 'csb', description: 'Clear screen blood', category: 'Visual' },
        { name: 'showlooksmenu player 1', description: 'Open character customization', category: 'Character' },
      ]
    },
  ];

  const filteredReferences = references.map(section => ({
    ...section,
    items: section.items.filter(item =>
      searchQuery === '' ||
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.example?.toLowerCase().includes(searchQuery.toLowerCase())
    )
  })).filter(section => section.items.length > 0);

  const containerClassName = embedded
    ? 'flex flex-col bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-lg border border-slate-800'
    : 'flex flex-col h-full bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900';

  return (
    <div className={containerClassName}>
      {/* Header */}
      <div className="p-6 border-b border-slate-700/50 bg-slate-800/50">
        <div className="flex items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-3">
            <Book className="w-8 h-8 text-emerald-400" />
            <div>
              <h1 className="text-2xl font-bold text-white">Quick Reference</h1>
              <p className="text-sm text-slate-400">Fallout 4 modding essentials</p>
            </div>
          </div>
          {!embedded && (
            <Link
              to="/knowledge"
              className="px-3 py-2 border border-emerald-500/30 text-[10px] font-black uppercase tracking-widest text-emerald-200 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 transition-colors"
            >
              Knowledge Base
            </Link>
          )}
        </div>

        {/* Search */}
        <div className="relative">
          <input
            type="text"
            placeholder="Search references..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-900 border border-slate-600 rounded-lg px-4 py-2 pl-10 text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none"
          />
          <Book className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        <ToolsInstallVerifyPanel
          accentClassName="text-emerald-300"
          description="This page is a fast in-app cheat sheet. Use search to narrow down snippets and standards without needing external docs."
          verify={[
            'Type a keyword in search and confirm the list filters immediately.',
            'Expand/collapse a section and confirm it stays open while you browse.'
          ]}
          firstTestLoop={[
            'Search for one concept you are working on (e.g., “OnInit” or “precombines”).',
            'Copy the example into your notes and adapt it to your current script.'
          ]}
        />
        {filteredReferences.map((section) => {
          const isExpanded = expandedSections.includes(section.id);
          const Icon = section.icon;

          return (
            <div
              key={section.id}
              className="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700/50 overflow-hidden"
            >
              {/* Section Header */}
              <button
                onClick={() => toggleSection(section.id)}
                className="w-full flex items-center justify-between p-4 hover:bg-slate-700/30 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <Icon className="w-5 h-5 text-emerald-400" />
                  <h2 className="text-lg font-bold text-white">{section.title}</h2>
                  <span className="text-xs text-slate-500 bg-slate-900 px-2 py-1 rounded-full">
                    {section.items.length} items
                  </span>
                </div>
                {isExpanded ? (
                  <ChevronUp className="w-5 h-5 text-slate-400" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-slate-400" />
                )}
              </button>

              {/* Section Content */}
              {isExpanded && (
                <div className="p-4 pt-0 space-y-2">
                  {section.items.map((item, index) => {
                    const itemId = `${section.id}-${index}`;
                    const isOpen = openedItemId === itemId;
                    return (
                      <div
                        key={index}
                        className="bg-slate-900/50 rounded-lg p-3 border border-slate-700/30 hover:border-emerald-500/30 transition-colors group"
                      >
                        <div className="flex items-start justify-between gap-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <code className="text-sm font-mono text-emerald-400 bg-slate-950 px-2 py-0.5 rounded">
                              {item.name}
                            </code>
                            {item.category && (
                              <span className="text-xs text-slate-500 bg-slate-800 px-2 py-0.5 rounded">
                                {item.category}
                              </span>
                            )}
                          </div>
                          {isOpen && (
                            <div id={`quick-ref-${itemId}-details`}>
                              <p className="text-sm text-slate-300">{item.description}</p>
                              {item.example && (
                                <div className="relative mt-2 group/code">
                                  <pre className="text-xs font-mono text-slate-400 bg-slate-950 p-2 pr-10 rounded border border-slate-800 overflow-x-auto">
                                    {item.example}
                                  </pre>
                                  <button
                                    onClick={() => copyToClipboard(item.example!, `${itemId}-ex`)}
                                    className="absolute top-1.5 right-1.5 p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-emerald-300 transition-colors opacity-0 group-hover/code:opacity-100"
                                    title="Copy to clipboard"
                                    aria-label="Copy example to clipboard"
                                  >
                                    {copiedId === `${itemId}-ex`
                                      ? <Check className="w-3 h-3 text-emerald-400" />
                                      : <Copy className="w-3 h-3" />}
                                  </button>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                        <button
                          onClick={() => toggleItemInfo(itemId)}
                          className="shrink-0 text-slate-500 hover:text-emerald-400 transition-colors"
                          title={isOpen ? 'Hide item details' : 'Open item details'}
                          aria-expanded={isOpen}
                          aria-controls={`quick-ref-${itemId}-details`}
                          aria-label={isOpen ? `Hide details for ${item.name}` : `Open details for ${item.name}`}
                        >
                          {isOpen
                            ? <ChevronUp className="w-4 h-4 text-emerald-400" />
                            : <ChevronDown className="w-4 h-4" />
                          }
                        </button>
                      </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}

        {filteredReferences.length === 0 && (
          <div className="text-center py-12 text-slate-500">
            <Book className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>No references found matching "{searchQuery}"</p>
          </div>
        )}
      </div>
    </div>
  );
};
