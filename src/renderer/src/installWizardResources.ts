export type InstallWizardTopic = 'f4se' | 'xedit' | 'ss2' | 'prp' | 'patching';

export type InstallWizardResource = {
  label: string;
  url: string;
  note?: string;
  content: string;
  tags: string[];
};

export const installWizardResources: Record<InstallWizardTopic, InstallWizardResource[]> = {
  f4se: [
    {
      label: 'F4SE — Fallout 4 Script Extender (official site)',
      url: 'https://f4se.silverlock.org',
      note: 'Required by almost every script-based mod. Match the F4SE version EXACTLY to your Fallout 4 version (OG 1.10.163 or Next-Gen 1.10.984+).',
      content: 'The Fallout 4 Script Extender is a mandatory prerequisite for almost every scripted mod including Sim Settlements 2, MCM, HUDFramework, and hundreds of others. Download from the official site only. You must match the F4SE version number exactly to your installed Fallout 4 version — mixing OG F4SE with a Next-Gen game (or vice versa) will cause an immediate launch failure. After installing, launch the game via f4se_loader.exe or the F4SE entry in your mod manager, never via the default Fallout4.exe launcher.',
      tags: ['f4se', 'script extender', 'prerequisite', 'install-wizard', 'critical'],
    },
    {
      label: 'Address Library for F4SE (Nexus #47327)',
      url: 'https://www.nexusmods.com/fallout4/mods/47327',
      note: 'Required by most modern F4SE plugins. Install the version bundle that matches your game (All-In-One OG or Next-Gen).',
      content: 'Address Library for F4SE Plugins provides version-independent memory address lookups used by virtually all modern F4SE plugins. Install the correct bundle for your game version: the All-In-One package for OG (1.10.163) or the separate Next-Gen file for 1.10.984+. Without it, most newer F4SE-based mods will fail silently or crash on load. Install it through your mod manager, verify it appears in your load order, and ensure no duplicate versions are present.',
      tags: ['f4se', 'address library', 'nexus', 'prerequisite', 'install-wizard'],
    },
    {
      label: 'Mod Configuration Menu — MCM (Nexus #21497)',
      url: 'https://www.nexusmods.com/fallout4/mods/21497',
      note: 'F4SE-based in-game settings menu used by hundreds of mods. Install if any mod in your list mentions MCM.',
      content: 'Mod Configuration Menu (MCM) is an F4SE-dependent framework that provides an in-game settings UI for mods that support it. It requires a working F4SE installation. If any mod in your list mentions MCM support, install this before that mod and verify it is loaded after F4SE in your load order. Mods that rely on MCM will silently lose their settings UI if MCM is missing or installed incorrectly.',
      tags: ['f4se', 'mcm', 'mod configuration menu', 'nexus', 'install-wizard'],
    },
    {
      label: 'HUDFramework (Nexus #20309)',
      url: 'https://www.nexusmods.com/fallout4/mods/20309',
      note: 'Required by SS2 and many HUD-modifying tools. Needs F4SE.',
      content: 'HUDFramework is a shared HUD-element library used by Sim Settlements 2, Workshop Framework, and other major mods. It requires F4SE and must be installed before SS2. Place it early in your load order. If SS2 complains about missing HUD elements or you see SS2 UI components not rendering, verify HUDFramework is present and loading correctly.',
      tags: ['f4se', 'hudframework', 'hud', 'ss2', 'nexus', 'install-wizard'],
    },
  ],
  xedit: [
    {
      label: 'xEdit (GitHub repository)',
      url: 'https://github.com/TES5Edit/TES5Edit',
      note: 'Primary upstream source for xEdit/FO4Edit builds.',
      content: 'Primary upstream source for xEdit and FO4Edit builds. After download, unzip it to a stable tools folder instead of a temporary Desktop location, point Mossy at the FO4Edit executable in External Tools Settings, then launch it once and wait for "Background Loader: finished" so scripts and caches initialize correctly.',
      tags: ['xedit', 'fo4edit', 'downloads', 'tools', 'install-wizard'],
    },
  ],
  ss2: [
    {
      label: 'Sim Settlements 2 (official site)',
      url: 'https://simsettlements2.com',
      note: 'Official hub; downloads are typically linked from there.',
      content: 'Official Sim Settlements 2 hub. Use it to find the main SS2 downloads and project documentation, then install the correct files for your mod manager and verify the wiki requirements before building city plans or add-ons.',
      tags: ['ss2', 'sim settlements 2', 'downloads', 'official', 'install-wizard'],
    },
    {
      label: "SS2 Add-On Maker's Toolkit (Nexus #48521)",
      url: 'https://www.nexusmods.com/fallout4/mods/48521',
      note: 'Beginner-focused toolkit with guided tutorials and helper files.',
      content: 'Beginner-focused SS2 add-on toolkit with guided tutorials and helper files. Use it as the starter package when you want templates, examples, and helper assets for creating your own Sim Settlements 2 content.',
      tags: ['ss2', 'sim settlements 2', 'toolkit', 'nexus', 'install-wizard'],
    },
    {
      label: 'Wasteland Reconstruction Kit (Nexus #48960)',
      url: 'https://www.nexusmods.com/fallout4/mods/48960',
      note: '10,000+ SS2-ready buildable assets and prefab resources.',
      content: 'Large SS2-ready asset pack with 10,000+ buildable assets and prefabs. Use it as a content library when assembling settlements, plots, and city plans so you can build with SS2-compatible resources instead of making every piece from scratch.',
      tags: ['ss2', 'sim settlements 2', 'assets', 'prefabs', 'nexus', 'install-wizard'],
    },
    {
      label: 'City Plan Contest Assistant (Nexus #50366)',
      url: 'https://www.nexusmods.com/fallout4/mods/50366',
      note: 'Contest-focused utility for fast setup, checks, and export helpers.',
      content: 'Contest-focused utility for fast setup, checks, and export helpers. Use it when you need city-plan-specific helpers for preparing, validating, and exporting SS2 contest submissions or structured city plan projects.',
      tags: ['ss2', 'sim settlements 2', 'city plan', 'contest', 'nexus', 'install-wizard'],
    },
    {
      label: 'SS2 Wiki Tutorials',
      url: 'https://wiki.simsettlements2.com',
      note: 'Core docs and learning references.',
      content: 'Primary documentation and learning reference for Sim Settlements 2. Use it for setup requirements, plot and city plan workflows, and the official explanations Mossy can build on when guiding a user through SS2 authoring.',
      tags: ['ss2', 'sim settlements 2', 'wiki', 'docs', 'install-wizard'],
    },
    {
      label: 'Bethesda Mod School / SS2 videos',
      url: 'https://www.youtube.com/results?search_query=Bethesda+Mod+School+Sim+Settlements+2',
      note: 'Video learning path for beginners and visual learners.',
      content: 'Video learning path for Sim Settlements 2 beginners and visual learners. Use these when the user needs a guided walkthrough to complement written docs before they start building their own SS2 content.',
      tags: ['ss2', 'sim settlements 2', 'video', 'tutorials', 'install-wizard'],
    },
    {
      label: 'Nexus search: Sim Settlements 2',
      url: 'https://www.nexusmods.com/fallout4/search/?gsearch=Sim%20Settlements%202&gsearchtype=mods',
      note: 'Search results in case you install via Nexus.',
      content: 'Nexus search fallback for Sim Settlements 2 downloads. Use it to locate the main mod, add-ons, or dependency pages when the user prefers installing through Nexus or needs to confirm the exact mod page.',
      tags: ['ss2', 'sim settlements 2', 'nexus', 'search', 'install-wizard'],
    },
  ],
  prp: [
    {
      label: "PJM's Previs Patching Scripts (Nexus #69978)",
      url: 'https://www.nexusmods.com/fallout4/mods/69978',
      note: 'By PJMail. V4.9 PJMScripts bundle (Feb 2026). Manual download ONLY — do NOT use a mod manager. Also grab every file under the "Updated Files" tab to replace older copies.',
      content: 'PJM scripts bundle for PRP and previs/precombine patching. This is a manual download only toolset, not a mod manager installable. Download the archive manually, unzip to a dedicated tools folder, read the README, and follow the PJMail install guide before running any patching scripts. Registering the script path in Mossy External Tools lets Mossy trigger PRP-compatible export workflows automatically.',
      tags: ['prp', 'previs', 'precombine', 'pjm', 'scripts', 'install-wizard'],
    },
    {
      label: 'PRP — PreVis Repair Pack (Nexus #46403)',
      url: 'https://www.nexusmods.com/fallout4/mods/46403',
      note: 'March 2026 stable build (81.5+). Load late in your order; PRP compatibility patches load after PRP.',
      content: 'PreVis Repair Pack is the community-maintained previs/precombine repair suite for Fallout 4. It resolves broken precombined meshes in hundreds of cells caused by incompatible mods. Install the main file plus any compatibility patches for your active mods. Load PRP late in your load order, with its compatibility patches loading after. Required for stable performance in modded worldspace cells on NG/1.11.x.',
      tags: ['prp', 'previs', 'precombine', 'nexus', 'install-wizard'],
    },
  ],
  patching: [
    {
      label: 'xEdit / FO4Edit (GitHub)',
      url: 'https://github.com/TES5Edit/TES5Edit',
      note: 'Version 4.0.3+ required for reliable FormID patching and script support.',
      content: 'xEdit (FO4Edit) is the primary tool for creating compatibility patches. Load the conflicting plugins, inspect override records, and copy winning overrides into a new patch plugin. Always load all masters. Use Ctrl+S to save, and run Check for Errors before closing. Point Mossy at the FO4Edit executable in External Tools Settings so Mossy can guide you through patch creation workflows.',
      tags: ['xedit', 'fo4edit', 'patching', 'compatibility', 'install-wizard'],
    },
    {
      label: 'Mator Smash (Nexus #49193)',
      url: 'https://www.nexusmods.com/skyrim/mods/90987',
      note: 'Automated conflict resolution tool — creates a bashed/smashed patch from your load order.',
      content: 'Mator Smash automates conflict detection and patch creation across your entire load order. Use it after manually resolving critical conflicts in xEdit to catch remaining record-level overrides. Configure the rule sets for your mod types (weapons, armor, leveled lists, etc.) before running. Review the output patch in xEdit before activating it.',
      tags: ['patching', 'conflict', 'automation', 'install-wizard'],
    },
    {
      label: 'Wrye Bash (Nexus #20032)',
      url: 'https://www.nexusmods.com/fallout4/mods/20032',
      note: 'Bashed Patch builder — merges leveled lists and resolves common override conflicts.',
      content: 'Wrye Bash builds a Bashed Patch that merges leveled list changes from multiple mods, preventing loot/spawn conflicts without manual patching. Run it after finalizing your load order. Enable the Leveled Lists patcher, optionally the Tweak Settings patcher, then rebuild the Bashed Patch and place it near the end of your load order. Rebuild after any load order change.',
      tags: ['patching', 'bashed-patch', 'leveled-lists', 'install-wizard'],
    },
    {
      label: 'LOOT — Load Order Optimisation Tool',
      url: 'https://loot.github.io',
      note: 'Sorts your load order automatically using community-maintained metadata rules.',
      content: 'LOOT automatically sorts your load order using community-maintained conflict and priority metadata. Run it after installing or removing mods. Review LOOT warnings and errors before accepting the sort — some warnings require manual resolution. After sorting, rebuild your Bashed Patch and verify any manual load order locks are still in place. Not a replacement for manual conflict resolution in xEdit.',
      tags: ['patching', 'load-order', 'loot', 'install-wizard'],
    },
  ],
};

export const installWizardBuiltInLinks = installWizardResources;
